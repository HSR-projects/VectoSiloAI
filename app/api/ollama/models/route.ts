import { NextResponse, type NextRequest } from "next/server";
import { listModels, DEFAULT_MODEL, FORCE_MODEL, isBlockedModel } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (FORCE_MODEL) {
    return NextResponse.json({ models: [FORCE_MODEL], default: FORCE_MODEL });
  }

  const openaiKey = req.headers.get("x-openai-key") || process.env.OPENAI_API_KEY || "";
  const anthropicKey = req.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY || "";
  const geminiKey = req.headers.get("x-gemini-key") || process.env.GEMINI_API_KEY || "";
  const openrouterKey = req.headers.get("x-openrouter-key") || process.env.OPENROUTER_API_KEY || "";

  const allModelNames: string[] = [];

  // 1. Fetch Ollama / Private models from server
  try {
    const ollamaModels = await listModels();
    const names = ollamaModels.map((m) => m.name).filter((n) => n && !isBlockedModel(n));
    allModelNames.push(...names);
  } catch (e) {
    console.error("[models-api] Ollama fetch error:", (e as Error).message);
  }

  // Deduplicate and ensure default model exists
  const uniqueModels = Array.from(new Set(allModelNames));
  if (DEFAULT_MODEL && !uniqueModels.includes(DEFAULT_MODEL)) {
    uniqueModels.unshift(DEFAULT_MODEL);
  }

  return NextResponse.json({ models: uniqueModels, default: DEFAULT_MODEL });
}
