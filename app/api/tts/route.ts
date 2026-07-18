import { spawn } from "child_process";
import { accessSync, constants } from "fs";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PIPER_BIN = process.env.TTS_PIPER_BIN || "/opt/voip-ai/tts/piper";
const PIPER_MODEL = process.env.TTS_PIPER_MODEL || "/opt/voip-ai/tts/voices/en_US-lessac-high.onnx";
const PIPER_ESPEAK_DATA = "/usr/lib/x86_64-linux-gnu/espeak-ng-data";
const CACHE_DIR = "/opt/voip-ai/audio/web-cache";

const piperAvailable = (() => {
  try { accessSync(PIPER_BIN, constants.X_OK); return true; } catch { return false; }
})();

const memCache = new Map<string, { audio: Buffer; mime: string }>();

async function ensureCacheDir() {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}
ensureCacheDir().catch(() => {});

function audioResponse(audio: Buffer, mime: string) {
  return new Response(new Uint8Array(audio), {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function POST(req: Request) {
  let text = "";
  let voice: string | undefined;
  try {
    const body = await req.json();
    text = body.text ?? "";
    voice = body.voice;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  text = (text ?? "").trim().slice(0, 4000);
  if (!text) return NextResponse.json({ error: "Missing text." }, { status: 400 });

  const modelPath = voice
    ? `/opt/voip-ai/tts/voices/${voice}.onnx`
    : PIPER_MODEL;

  const cacheKey = `${createHash("sha1").update(text + modelPath).digest("hex").slice(0, 16)}`;
  const mime = piperAvailable ? "audio/wav" : "audio/mpeg";

  try {
    const cached = memCache.get(cacheKey);
    if (cached) return audioResponse(cached.audio, cached.mime);

    const cachePath = join(CACHE_DIR, `${cacheKey}.bin`);
    try {
      const buf = await fs.readFile(cachePath);
      memCache.set(cacheKey, { audio: buf, mime });
      return audioResponse(buf, mime);
    } catch {
      // not cached — synthesize
    }

    const audio = piperAvailable
      ? await synthesizePiper(text, modelPath)
      : await synthesizeEdgeTTS(text);
    await fs.writeFile(cachePath, audio).catch(() => {});
    memCache.set(cacheKey, { audio, mime });
    return audioResponse(audio, mime);
  } catch (e) {
    console.error("[tts] Synthesis error:", e);
    return NextResponse.json({ error: "TTS synthesis failed." }, { status: 500 });
  }
}

function synthesizePiper(text: string, modelPath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const piper = spawn(
      PIPER_BIN,
      [
        "--model", modelPath,
        "--espeak_data", PIPER_ESPEAK_DATA,
        "--output_file", "-",
        "--noise-scale", "0.667",
        "--noise-w", "0.8",
        "--length-scale", "1.0",
        "--sentence-silence", "0.2",
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

function synthesizeEdgeTTS(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const python = process.env.PYTHON_BIN || join(process.cwd(), "venv", "bin", "python3");
    const script = join(process.cwd(), "scripts", "edge-tts-wrapper.py");

    const proc = spawn(python, [script], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    proc.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    proc.stderr.on("data", () => {});

    proc.on("close", (code) => {
      if (code !== 0 || chunks.length === 0) {
        return reject(new Error(`edge-tts exited with code ${code}`));
      }
      resolve(Buffer.concat(chunks));
    });

    proc.on("error", reject);

    proc.stdin.write(text);
    proc.stdin.end();
  });
}
