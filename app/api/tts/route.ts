import { spawn } from "child_process";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PIPER_BIN = "/opt/voip-ai/tts/piper";
const PIPER_MODEL = "/opt/voip-ai/tts/voices/en_US-ljspeech-high.onnx";
const PIPER_ESPEAK_DATA = "/usr/lib/x86_64-linux-gnu/espeak-ng-data";
const CACHE_DIR = "/opt/voip-ai/audio/web-cache";

// In-memory cache for hot phrases (avoids even the disk read)
const memCache = new Map<string, Buffer>();

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

ensureCacheDir().catch(() => {});

export async function POST(req: Request) {
  let text = "";
  try {
    ({ text } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  text = (text ?? "").trim().slice(0, 4000);
  if (!text) return NextResponse.json({ error: "Missing text." }, { status: 400 });

  const hash = createHash("sha1").update(text).digest("hex").slice(0, 12);

  try {
    // 1) Memory cache hit
    if (memCache.has(hash)) {
      return wavResponse(memCache.get(hash)!);
    }

    // 2) Disk cache hit
    const cachePath = join(CACHE_DIR, `${hash}.wav`);
    try {
      const cached = await fs.readFile(cachePath);
      memCache.set(hash, cached);
      return wavResponse(cached);
    } catch {
      // not cached yet — synthesize
    }

    // 3) Run Piper and cache the result
    const wav = await synthesize(text);
    await fs.writeFile(cachePath, wav).catch(() => {});
    memCache.set(hash, wav);
    return wavResponse(wav);
  } catch (e) {
    console.error("[tts] Piper error:", e);
    return NextResponse.json({ error: "TTS synthesis failed." }, { status: 500 });
  }
}

function wavResponse(buf: Buffer) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

function synthesize(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const piper = spawn(
      PIPER_BIN,
      [
        "--model", PIPER_MODEL,
        "--espeak_data", PIPER_ESPEAK_DATA,
        "--output_file", "-",
        "--noise-scale", "0.8",
        "--noise-w", "0.7",
        "--length-scale", "1.05",
        "--sentence-silence", "0.3",
        "--quiet",
      ],
      { env: { ...process.env, LD_LIBRARY_PATH: "/opt/voip-ai/tts" } }
    );

    const chunks: Buffer[] = [];
    piper.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    piper.stderr.on("data", () => {});

    piper.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Piper exited with code ${code}`));
      resolve(Buffer.concat(chunks));
    });

    piper.on("error", reject);

    piper.stdin.write(text);
    piper.stdin.end();
  });
}
