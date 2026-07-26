import { NextResponse } from "next/server";
import { chat, DEFAULT_MODEL, OllamaError } from "@/lib/ollama";
import { buildRouterPrompt } from "@/lib/prompts";
import type { RouteDecision, Role } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteRequestBody {
  query: string;
  model?: string;
  history?: { role: Role; content: string }[];
}

/**
 * Agentic search router. Returns whether the query needs a live web search.
 * Fails open: if the model is unreachable or returns garbage, we default to
 * searching (better to over-ground than answer stale).
 */
export async function POST(req: Request) {
  let body: RouteRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { query, model = DEFAULT_MODEL, history = [] } = body;
  if (!query?.trim()) {
    return NextResponse.json({ error: "Missing query." }, { status: 400 });
  }

  const fastResult = fastRouteCheck(query);
  if (fastResult) {
    return NextResponse.json(fastResult);
  }

  const fallback: RouteDecision = {
    needsSearch: true,
    searchQuery: query,
    reason: "defaulted to search",
  };

  try {
    const raw = await chat({
      model,
      messages: [{ role: "user", content: buildRouterPrompt(query, history) }],
      options: { temperature: 0 },
    });
    return NextResponse.json(parseDecision(raw, query) ?? fallback);
  } catch (e) {
    if (e instanceof OllamaError) {
      // Model unreachable — let the caller decide; default to search.
      return NextResponse.json(fallback);
    }
    return NextResponse.json(fallback);
  }
}

function fastRouteCheck(query: string): RouteDecision | null {
  const q = query.trim().toLowerCase();

  // Greetings / simple conversational
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|howdy|sup|yo|what's\s+up|how\s+are\s+you|who\s+are\s+you|what\s+is\s+your\s+name|thanks|thank\s+you)[.!?]*$/i.test(q)) {
    return { needsSearch: false, searchQuery: query, reason: "conversational greeting" };
  }

  // Coding & development requests
  if (/\b(code|build|write|create|implement|debug|refactor|fix|function|class|component|algorithm|script|css|html|js|ts|python|react|node|api|sql)\b/i.test(q) &&
      !/\b(latest|version|news|release|update|documentation|doc|docs|api\s+changes|2025|2026)\b/i.test(q)) {
    return { needsSearch: false, searchQuery: query, reason: "coding request" };
  }

  // General knowledge / math / creative writing / explanations
  if (/\b(explain|what\s+is|how\s+does|why\s+is|tell\s+me\s+about|write\s+a\s+poem|essay|story|calculate|solve|convert)\b/i.test(q) &&
      !/\b(today|now|current|latest|recent|news|weather|price|stock|score|winner|election|2025|2026)\b/i.test(q)) {
    return { needsSearch: false, searchQuery: query, reason: "general knowledge prompt" };
  }

  // Explicit live info triggers (definitely needs search)
  if (/\b(today|current|latest|now|recent|news|weather|price|stock|score|winner|election|release\s+date|2025|2026|who\s+is\s+the\s+current|what\s+is\s+the\s+price)\b/i.test(q)) {
    return { needsSearch: true, searchQuery: query, reason: "real-time info query" };
  }

  return null;
}

function parseDecision(raw: string, query: string): RouteDecision | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as Partial<RouteDecision>;
    if (typeof obj.needsSearch !== "boolean") return null;
    return {
      needsSearch: obj.needsSearch,
      searchQuery:
        (typeof obj.searchQuery === "string" && obj.searchQuery.trim()) ||
        query,
      reason:
        (typeof obj.reason === "string" && obj.reason.trim().slice(0, 80)) ||
        (obj.needsSearch ? "needs fresh info" : "answerable directly"),
    };
  } catch {
    return null;
  }
}
