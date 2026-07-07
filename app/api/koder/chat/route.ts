/**
 * Koder AI chat endpoint.
 * Accepts Koder bearer tokens (kd-…) and:
 *   - Subscription sessions: metered by 5-hour refill window (koderUsage)
 *   - API-key sessions: metered by prepaid credits (same as /api/v1/chat/completions)
 *
 * Supports streaming SSE and JSON responses.
 * Request body mirrors the KodaAI chat format used by the Koder CLI.
 */

import { NextResponse } from "next/server";
import { chat, chatStream, DEFAULT_MODEL, OllamaError } from "@/lib/ollama";
import { resolveKoderSession, consumeKoderRequest } from "@/lib/koderUsage";
import { getUserById, deductCredits, getBillableCredits } from "@/lib/auth";
import { estimateTokens, computeCost, API_MIN_CENTS } from "@/lib/credits";
import { recordUsage } from "@/lib/usageStore";
import type { OllamaMessage } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Koder system prompt — coding-focused
const KODER_SYSTEM = `You are Koder, an autonomous AI coding agent built on KodaAI. You help developers write, debug, refactor, and understand code. You have access to the user's codebase through tool descriptions they provide. Be concise, precise, and action-oriented. When writing code, always write complete, working implementations. Use markdown code blocks with language tags.`;

export async function POST(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "Missing Authorization header." }, 401);

  // ── Resolve session ───────────────────────────────────────────────────────
  const session = await resolveKoderSession(token);
  if (!session) return json({ error: "Invalid or expired Koder token." }, 401);

  const user = await getUserById(session.userId);
  if (!user) return json({ error: "User not found." }, 401);

  // ── Usage check ───────────────────────────────────────────────────────────
  if (session.authType === "subscription") {
    const usage = await consumeKoderRequest(token);
    if (!usage.allowed) {
      const hrs = Math.ceil((usage.resetIn ?? KODER_WINDOW_MS) / 3_600_000);
      return json({
        error: `Koder request limit reached (${usage.limit} per 5h window). Resets in ~${hrs}h. Upgrade to API key for unlimited usage.`,
        resetIn: usage.resetIn,
        limit: usage.limit,
        used: usage.used,
      }, 429);
    }
  } else {
    // API-key auth: check credits
    const credits = await getBillableCredits(user.id, session.apiKeyId);
    if (credits < API_MIN_CENTS) {
      return json({ error: "Insufficient credits. Top up at chat.hsrprojects.org/developers." }, 402);
    }
  }

  // ── Parse request ─────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const rawMessages = (body.messages as { role?: string; content?: string }[]) ?? [];
  const model = (body.model as string) || DEFAULT_MODEL;
  const stream = body.stream === true;

  const messages: OllamaMessage[] = [];

  for (const m of rawMessages) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    let content = m.content ?? "";

    // Strip inline base64 image tags and attach them for KodaAI vision-capable models.
    const imageMatch = content.match(/<image>([A-Za-z0-9+/=\s]+)<\/image>/);
    if (imageMatch && m.role === "user") {
      const b64 = imageMatch[1].replace(/\s/g, "");
      content = content.replace(/<image>[\s\S]*?<\/image>/, "").trim();
      messages.push({ role: "user", content, images: [b64] } as OllamaMessage & { images: string[] });
      continue;
    }

    messages.push({ role: m.role, content });
  }

  if (!messages.find((m) => m.role === "user")) {
    return json({ error: "No user message." }, 400);
  }

  // Insert system at front.
  messages.unshift({ role: "system", content: KODER_SYSTEM });

  // ── Stream response ───────────────────────────────────────────────────────
  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullText = "";
          for await (const chunk of chatStream({ model, messages })) {
            fullText += chunk;
            const data = JSON.stringify({ choices: [{ delta: { content: chunk }, finish_reason: null }] });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));

          // Bill credits for API-key sessions
          if (session.authType === "apikey") {
            const promptT = estimateTokens(messages.map((m) => m.content).join(" "));
            const completionT = estimateTokens(fullText);
            const cost = computeCost(promptT, completionT);
            const left = await getBillableCredits(user.id, session.apiKeyId);
            const charged = Math.min(cost, left);
            if (charged > 0) await deductCredits(user.id, charged, session.apiKeyId);
            await recordUsage(user.id, { promptTokens: promptT, completionTokens: completionT, costCents: charged });
          }
        } catch (e) {
          const msg = e instanceof OllamaError ? e.message : "Model error.";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });
    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", ...CORS },
    });
  }

  // ── Non-stream response ───────────────────────────────────────────────────
  try {
    const text = await chat({ model, messages });

    if (session.authType === "apikey") {
      const promptT = estimateTokens(messages.map((m) => m.content).join(" "));
      const completionT = estimateTokens(text);
      const cost = computeCost(promptT, completionT);
      const left = await getBillableCredits(user.id, session.apiKeyId);
      const charged = Math.min(cost, left);
      if (charged > 0) await deductCredits(user.id, charged, session.apiKeyId);
      await recordUsage(user.id, { promptTokens: promptT, completionTokens: completionT, costCents: charged });
    }

    return json({
      choices: [{ message: { role: "assistant", content: text }, finish_reason: "stop" }],
    });
  } catch (e) {
    const msg = e instanceof OllamaError ? e.message : "Model error.";
    return json({ error: msg }, 502);
  }
}

const KODER_WINDOW_MS = 5 * 60 * 60 * 1000;
