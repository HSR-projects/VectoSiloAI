import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { OLLAMA_BASE_URL, OLLAMA_API_KEY, IS_OPENAI_COMPAT, OllamaError } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "8", 10), 1), 8);

  if (!q || q.length < 2 || q.length > 100) {
    return NextResponse.json({ query: q || "", suggestions: [], latencyMs: 0, degraded: false });
  }

  const start = Date.now();
  const user = await getCurrentUser();
  const plan = user?.plan || "free";
  
  // Custom plan users might have the autocomplete feature enabled, we'll check that.
  // For now, allow anyone not on free plan. (Assuming "pro", "max", "ultra" or custom with feature).
  if (plan === "free") {
    // Return empty AI suggestions for Free users. Frontend will still show IndexedDB recent searches.
    return NextResponse.json({ query: q, suggestions: [], latencyMs: Date.now() - start, degraded: false });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 250); // 250ms hard timeout

  try {
    const prompt = `You are a search autocomplete engine. The user has typed the prefix: "${q}". Generate ${limit} short, likely search queries that start with or logically complete this prefix. Return ONLY a valid JSON array of strings, e.g. ["query 1", "query 2"]. Do not include markdown, explanations, or prose.`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (OLLAMA_API_KEY) headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;

    const body = IS_OPENAI_COMPAT 
      ? {
          model: "gpt-oss:20b",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          temperature: 0.3
        }
      : {
          model: "gpt-oss:20b",
          messages: [{ role: "user", content: prompt }],
          stream: false,
          format: "json",
          options: { temperature: 0.3 }
        };

    const endpoint = IS_OPENAI_COMPAT ? `${OLLAMA_BASE_URL}/chat/completions` : `${OLLAMA_BASE_URL}/api/chat`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Ollama responded with ${res.status}`);
    }

    const data = await res.json();
    let content = IS_OPENAI_COMPAT ? data.choices?.[0]?.message?.content : data.message?.content;
    content = content || "[]";

    // Attempt to parse JSON
    let parsed: string[] = [];
    try {
      // Sometimes models wrap JSON in markdown block even if told not to
      const match = content.match(/\[.*\]/s);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch {
      parsed = [];
    }

    if (!Array.isArray(parsed)) {
      parsed = [];
    }

    const suggestions = parsed.slice(0, limit).map((text: string) => {
      // Find highlight range
      const lowerText = text.toLowerCase();
      const lowerQ = q.toLowerCase();
      const idx = lowerText.indexOf(lowerQ);
      const highlightRanges = idx >= 0 ? [[idx, idx + q.length]] : [];

      return {
        text,
        category: "ai",
        score: 0.55,
        highlightRanges
      };
    });

    return NextResponse.json({
      query: q,
      suggestions,
      latencyMs: Date.now() - start,
      degraded: false
    });

  } catch (error) {
    clearTimeout(timeoutId);
    // Timeout or network error -> Graceful degradation
    return NextResponse.json({
      query: q,
      suggestions: [],
      latencyMs: Date.now() - start,
      degraded: true
    });
  }
}
