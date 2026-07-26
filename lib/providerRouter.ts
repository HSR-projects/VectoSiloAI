import type { OllamaMessage } from "@/types"
import { getProvider } from "@/lib/providers"
import { OLLAMA_BASE_URL, OLLAMA_API_KEY, DEFAULT_MODEL } from "@/lib/ollama"

export interface ProviderRouteOptions {
  provider: string
  apiKey: string
  baseUrl: string
  model: string
  messages: OllamaMessage[]
  signal?: AbortSignal
}

export interface ProviderStreamResult {
  stream: ReadableStream<Uint8Array>
  contentType: string
}

async function openaiChatCompletions(opts: ProviderRouteOptions): Promise<Response> {
  const baseUrl = opts.baseUrl || getProvider(opts.provider)?.defaultBaseUrl || "https://api.openai.com/v1"
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`
  const apiKey = opts.apiKey

  const body = {
    model: opts.model,
    messages: opts.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
  }

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })
}

async function anthropicMessages(opts: ProviderRouteOptions): Promise<Response> {
  const baseUrl = opts.baseUrl || "https://api.anthropic.com/v1"
  const url = `${baseUrl.replace(/\/$/, "")}/messages`
  const apiKey = opts.apiKey

  const body = {
    model: opts.model,
    max_tokens: 4096,
    messages: opts.messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    stream: true,
  }

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })
}

async function geminiChat(opts: ProviderRouteOptions): Promise<Response> {
  const baseUrl = opts.baseUrl || "https://generativelanguage.googleapis.com/v1beta"
  const apiKey = opts.apiKey
  const model = opts.model || "gemini-pro"
  const url = `${baseUrl.replace(/\/$/, "")}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

  const contents = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
    signal: opts.signal,
  })
}

async function incogniAIChat(opts: ProviderRouteOptions): Promise<Response> {
  const baseUrl = OLLAMA_BASE_URL
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (OLLAMA_API_KEY) headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`

  return fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: opts.model || DEFAULT_MODEL,
      messages: opts.messages,
      stream: true,
    }),
    signal: opts.signal,
  })
}

export async function routeToProvider(opts: ProviderRouteOptions): Promise<Response> {
  const provider = getProvider(opts.provider)

  if (!provider || opts.provider === "incogni-ai") {
    return incogniAIChat(opts)
  }

  switch (provider.type) {
    case "anthropic":
      return anthropicMessages(opts)
    case "gemini":
      return geminiChat(opts)
    case "openai":
    case "openai-compat":
    default:
      return openaiChatCompletions(opts)
  }
}

export function streamOpenAI(res: Response): ReadableStream<Uint8Array> {
  let buffer = ""
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      if (!res.body) {
        controller.close()
        return
      }
      const reader = res.body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith("data: ")) continue
            const data = trimmed.slice(6)
            if (data === "[DONE]") continue
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content || ""
              if (content) controller.enqueue(encoder.encode(content))
            } catch {
              /* skip malformed JSON */
            }
          }
        }
      } catch {
        /* stream ended */
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })
}

export function streamAnthropic(res: Response): ReadableStream<Uint8Array> {
  let buffer = ""
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      if (!res.body) {
        controller.close()
        return
      }
      const reader = res.body.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() || ""
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data: ")) continue
            const data = trimmed.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                controller.enqueue(encoder.encode(parsed.delta.text))
              }
            } catch {
              /* skip malformed JSON */
            }
          }
        }
      } catch {
        /* stream ended */
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })
}

/** Yield RichDelta objects from a provider response. */
export async function* streamRichFromProvider(
  provider: string,
  opts: ProviderRouteOptions,
): AsyncGenerator<{ content?: string; thinking?: string }, void, unknown> {
  const res = await routeToProvider(opts)
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error")
    throw new Error(`${provider} returned ${res.status}: ${text}`)
  }
  if (!res.body) throw new Error("No response body from provider")

  const prov = getProvider(provider)
  if (!prov || prov.type === "anthropic") {
    const stream = streamAnthropic(res)
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        if (text) yield { content: text }
      }
    } finally {
      reader.releaseLock()
    }
  } else {
    const stream = streamOpenAI(res)
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })
        if (text) yield { content: text }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
