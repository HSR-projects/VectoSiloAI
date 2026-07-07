import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NVIDIA_BASE = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev";

interface GenerateBody {
  prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
}

export async function POST(req: Request) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NVIDIA_API_KEY not configured on the server." },
      { status: 500 }
    );
  }

  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = (body.prompt || "").trim();
  if (!prompt) {
    return NextResponse.json({ error: "`prompt` is required." }, { status: 400 });
  }

  const width = body.width ?? 1024;
  const height = body.height ?? 1024;

  const payload: Record<string, unknown> = {
    prompt,
    cfg_scale: body.cfgScale ?? 5,
    steps: body.steps ?? 25,
    width,
    height,
  };
  if (body.seed != null) payload.seed = body.seed;

  try {
    const res = await fetch(NVIDIA_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Nvidia API error (${res.status}): ${text}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    const artifact = json.artifacts?.[0];
    if (!artifact?.base64) {
      return NextResponse.json(
        { error: "No image returned from Nvidia API." },
        { status: 502 }
      );
    }

    const dataUrl = `data:image/png;base64,${artifact.base64}`;
    return NextResponse.json({ url: dataUrl, seed: artifact.seed });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Failed to reach Nvidia NIM." },
      { status: 502 }
    );
  }
}
