import type { OllamaMessage, OllamaModel } from "@/types";
import { recordIncident } from "@/lib/incidentStore";

/**
 * Ollama Cloud client.
 *
 * IncogniAI is configured to use Ollama Cloud (https://ollama.com) rather than a
 * local Ollama daemon. Requests are authenticated with a bearer API key.
 * The wire protocol is identical to local Ollama, so the same client works if
 * you ever point OLLAMA_BASE_URL back at http://localhost:11434.
 */

export const OLLAMA_BASE_URL = (
  process.env.VECTOSILO_CLOUD_BASE_URL || process.env.OLLAMA_BASE_URL || "https://ollama.com"
).replace(/\/$/, "");

export const OLLAMA_API_KEY = process.env.VECTOSILO_CLOUD_API_KEY || process.env.OLLAMA_API_KEY || "";

export const DEFAULT_MODEL = process.env.VECTOSILO_DEFAULT_MODEL || process.env.OLLAMA_DEFAULT_MODEL || "meta/llama-3.1-70b-instruct";

export const IS_OPENAI_COMPAT = OLLAMA_BASE_URL.includes("/v1") || OLLAMA_BASE_URL.includes("api.nvidia.com");

/**
 * Optional hard override. When OLLAMA_FORCE_MODEL is set, EVERY chat call uses
 * this model regardless of what the client selected (Auto, the model picker,
 * or an API request). This is the single choke point — chatStream/chat both
 * funnel through resolveModel — so nothing can route around it.
 */
export const FORCE_MODEL = process.env.OLLAMA_FORCE_MODEL || "";

/**
 * Models that are never offered or used — e.g. ones that log,s train on, or
 * otherwise track prompt data. Matched as case-insensitive substrings.
 * Configurable via OLLAMA_BLOCKED_MODELS (comma-separated); falls back to a
 * sane default that excludes known data-retaining preview models.
 */
const DEFAULT_BLOCKED = ["gemini"];
const BLOCK_LIST = (process.env.OLLAMA_BLOCKED_MODELS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const BLOCKED = BLOCK_LIST.length ? BLOCK_LIST : DEFAULT_BLOCKED;

/** True if a model id is on the privacy blocklist. */
export function isBlockedModel(name: string): boolean {
  const n = (name || "").toLowerCase();
  return BLOCKED.some((b) => n.includes(b));
}

export function resolveModel(requested?: string): string {
  let chosen = FORCE_MODEL || requested || DEFAULT_MODEL;
  if (!chosen || chosen === "auto") chosen = DEFAULT_MODEL;
  // Never route a blocked model upstream — fall back to the default.
  if (isBlockedModel(chosen) && !isBlockedModel(DEFAULT_MODEL)) return DEFAULT_MODEL;
  return chosen;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (OLLAMA_API_KEY) headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
  return headers;
}

export class OllamaError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "OllamaError";
    this.status = status;
  }
}

/** Friendly guidance attached to connection failures. */
function connectionHint(): string {
  return "Could not reach the IncogniAI model service. Check your connection and try again in a moment.";
}

/** Replace upstream Ollama errors with user-friendly messages and record incidents where needed. */
function sanitizeError(raw: string): string {
  const lower = raw.toLowerCase();

  // Session / rate-limit exhaustion — temporary, clears after a few hours.
  if (
    lower.includes("nvidia workers reached") ||
    lower.includes("session usage") ||
    lower.includes("usage limit") ||
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("upgrade for higher limits")
  ) {
    const friendly = "Our server is currently exhausted. Please wait about 3 hours to continue.";
    recordIncident("AI Model Service", friendly, 3 * 60 * 60 * 1000);
    return friendly;
  }

  // Subscription / plan required for this model — not a temporary rate limit.
  if (
    lower.includes("subscription") ||
    lower.includes("not available on your plan") ||
    lower.includes("model requires") ||
    lower.includes("access denied") ||
    (lower.includes("upgrade") && !lower.includes("upgrade for higher limits"))
  ) {
    return "This model requires a subscription. Please contact support or switch to a different model.";
  }

  return raw;
}

interface ChatOptions {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  signal?: AbortSignal;
  /** Sampling temperature, etc. */
  options?: Record<string, unknown>;
  /** Enable the model's native reasoning ("thinking"). */
  think?: boolean;
  /** Format of the output, e.g. "json" or a JSON schema object */
  format?: "json" | object;
}

/** Wrapper around fetch that retries after 60s if NVIDIA workers are maxed out. */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 1): Promise<Response> {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, options);
    if (!res.ok) {
      const cloned = res.clone();
      const text = await cloned.text().catch(() => "");
      if (text.toLowerCase().includes("nvidia workers reached") && attempt < maxRetries) {
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }
    }
    return res;
  }
}

/** A streamed delta: reasoning tokens and/or answer tokens. */
export interface RichDelta {
  content?: string;
  thinking?: string;
}

/**
 * Streaming chat that surfaces the model's native reasoning. Yields
 * `{ thinking }` for reasoning tokens and `{ content }` for answer tokens.
 * If the chosen model doesn't support `think`, it transparently retries
 * without it (so callers just get content and no reasoning).
 */
export async function* chatStreamRich(
  opts: ChatOptions
): AsyncGenerator<RichDelta, void, unknown> {
  const doFetch = (think: boolean) => {
    if (IS_OPENAI_COMPAT) {
      return fetchWithRetry(`${OLLAMA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: resolveModel(opts.model),
          messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
          // OpenAI equivalent logic if needed, think is not standard OpenAI but might be supported by NIM
        }),
        signal: opts.signal,
      });
    }
    return fetchWithRetry(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        model: resolveModel(opts.model),
        messages: opts.messages,
        stream: true,
        think: think || undefined,
        options: opts.options,
        format: opts.format,
      }),
      signal: opts.signal,
    });
  };

  let res: Response;
  try {
    res = await doFetch(!!opts.think);
  } catch {
    throw new OllamaError(connectionHint());
  }
  // Model may not support thinking — retry once without it.
  if (!res.ok && opts.think) {
    try {
      res = await doFetch(false);
    } catch {
      throw new OllamaError(connectionHint());
    }
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new OllamaError(
      sanitizeError(text || `Ollama request failed (${res.status}). ${connectionHint()}`),
      res.status
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      if (IS_OPENAI_COMPAT && line.startsWith("data: ")) {
        line = line.slice(6).trim();
        if (line === "[DONE]") continue;
      }
      try {
        const json = JSON.parse(line);
        if (IS_OPENAI_COMPAT) {
          const content = json.choices?.[0]?.delta?.content || "";
          // some APIs might stream reasoning differently, but we'll stick to standard content
          if (content) yield { content };
        } else {
          const thinking = json.message?.thinking || json.thinking || "";
          const content = json.message?.content || "";
          if (thinking) yield { thinking };
          if (content) yield { content };
          if (json?.error) throw new OllamaError(sanitizeError(String(json.error)));
        }
      } catch (e) {
        if (e instanceof OllamaError) throw e;
        // Ignore partial/non-JSON lines.
      }
    }
  }
}

/**
 * Streaming chat. Returns an async generator of content deltas.
 * Ollama streams newline-delimited JSON objects, each with message.content.
 */
export async function* chatStream(
  opts: ChatOptions
): AsyncGenerator<string, void, unknown> {
  let res: Response;
  try {
    if (IS_OPENAI_COMPAT) {
      res = await fetchWithRetry(`${OLLAMA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: resolveModel(opts.model),
          messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: opts.signal,
      });
    } else {
      res = await fetchWithRetry(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: resolveModel(opts.model),
          messages: opts.messages,
          stream: true,
          options: opts.options,
          format: opts.format,
        }),
        signal: opts.signal,
      });
    }
  } catch {
    throw new OllamaError(connectionHint());
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new OllamaError(
      sanitizeError(text || `Ollama request failed (${res.status}). ${connectionHint()}`),
      res.status
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      if (IS_OPENAI_COMPAT && line.startsWith("data: ")) {
        line = line.slice(6).trim();
        if (line === "[DONE]") continue;
      }
      try {
        const json = JSON.parse(line);
        if (IS_OPENAI_COMPAT) {
          const delta = json.choices?.[0]?.delta?.content || "";
          if (delta) yield delta;
        } else {
          const delta: string = json?.message?.content ?? "";
          if (delta) yield delta;
          if (json?.error) throw new OllamaError(sanitizeError(String(json.error)));
        }
      } catch (e) {
        if (e instanceof OllamaError) throw e;
        // Ignore partial/non-JSON lines.
      }
    }
  }
}

/** Non-streaming chat — returns the full assistant message content. */
export async function chat(opts: ChatOptions): Promise<string> {
  let res: Response;
  try {
    if (IS_OPENAI_COMPAT) {
      res = await fetchWithRetry(`${OLLAMA_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: resolveModel(opts.model),
          messages: opts.messages.map(m => ({ role: m.role, content: m.content })),
          stream: false,
        }),
        signal: opts.signal,
      });
    } else {
      res = await fetchWithRetry(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          model: resolveModel(opts.model),
          messages: opts.messages,
          stream: false,
          options: opts.options,
          format: opts.format,
        }),
        signal: opts.signal,
      });
    }
  } catch {
    throw new OllamaError(connectionHint());
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new OllamaError(
      sanitizeError(text || `Ollama request failed (${res.status}). ${connectionHint()}`),
      res.status
    );
  }

  const json = await res.json();
  if (IS_OPENAI_COMPAT) {
    return json?.choices?.[0]?.message?.content ?? "";
  }
  return json?.message?.content ?? "";
}

/** List models available to this Ollama endpoint. */
export async function listModels(): Promise<OllamaModel[]> {
  let res: Response;
  try {
    if (IS_OPENAI_COMPAT) {
      res = await fetchWithRetry(`${OLLAMA_BASE_URL}/models`, {
        headers: authHeaders(),
        cache: "no-store",
      });
    } else {
      res = await fetchWithRetry(`${OLLAMA_BASE_URL}/api/tags`, {
        headers: authHeaders(),
        cache: "no-store",
      });
    }
  } catch {
    throw new OllamaError(connectionHint());
  }

  if (!res.ok) {
    throw new OllamaError(
      `Failed to list models (${res.status}). ${connectionHint()}`,
      res.status
    );
  }

  const json = await res.json();
  if (IS_OPENAI_COMPAT) {
    if (Array.isArray(json?.data)) {
      return json.data.map((m: any) => ({ name: m.id, modified_at: m.created ? new Date(m.created * 1000).toISOString() : "", size: 0, digest: "" }));
    }
    return [];
  }
  const models: OllamaModel[] = Array.isArray(json?.models) ? json.models : [];
  return models;
}
