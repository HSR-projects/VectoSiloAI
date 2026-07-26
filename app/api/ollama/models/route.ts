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

  // 2. Dynamically fetch Google Gemini models if key is available
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          const geminiModels = data.models
            .map((m: { name?: string }) => (m.name || "").replace(/^models\//, ""))
            .filter((name: string) => name && !isBlockedModel(name));
          allModelNames.push(...geminiModels);
        }
      }
    } catch (e) {
      console.error("[models-api] Gemini fetch error:", (e as Error).message);
    }
  }

  // 3. Dynamically fetch OpenAI models if key is available
  if (openaiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data)) {
          const openAiModels = data.data
            .map((m: { id?: string }) => m.id || "")
            .filter((id: string) => id && !isBlockedModel(id));
          allModelNames.push(...openAiModels);
        }
      }
    } catch (e) {
      console.error("[models-api] OpenAI fetch error:", (e as Error).message);
    }
  }

  // 4. Dynamically fetch OpenRouter models if key is available
  if (openrouterKey) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: openrouterKey ? { Authorization: `Bearer ${openrouterKey}` } : {},
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.data)) {
          const openRouterModels = data.data
            .map((m: { id?: string }) => m.id || "")
            .filter((id: string) => id && !isBlockedModel(id));
          allModelNames.push(...openRouterModels);
        }
      }
    } catch (e) {
      console.error("[models-api] OpenRouter fetch error:", (e as Error).message);
    }
  }

  // Deduplicate and ensure default model exists
  const uniqueModels = Array.from(new Set(allModelNames));
  if (DEFAULT_MODEL && !uniqueModels.includes(DEFAULT_MODEL)) {
    uniqueModels.unshift(DEFAULT_MODEL);
  }

  return NextResponse.json({ models: uniqueModels, default: DEFAULT_MODEL });
}
