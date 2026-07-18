import { NextRequest, NextResponse } from 'next/server'
import { chat, DEFAULT_MODEL } from '@/lib/ollama'
import { searchWeb } from '@/lib/searxng'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { history, enableSearch = true }: { history: ChatMessage[]; enableSearch?: boolean } =
    await req.json()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const { reply, emotion, intensity } = await getReply(history, enableSearch, controller.signal)
    clearTimeout(timeout)
    return NextResponse.json({ reply, emotion, intensity })
  } catch (e: any) {
    clearTimeout(timeout)
    console.error('[voice-agent] Error:', e?.message ?? e)

    const fallback = e?.name === 'AbortError'
      ? "I'm thinking a bit slow right now. Could you try again?"
      : "Sorry, I had trouble with that. Could you say it again?"

    return NextResponse.json(
      { reply: fallback, emotion: 'neutral', intensity: 0.5 },
      { status: 200 }
    )
  }
}

async function getReply(
  history: ChatMessage[],
  enableSearch: boolean,
  signal?: AbortSignal
): Promise<{ reply: string; emotion: string; intensity: number }> {
  const lastUserMsg = [...history].reverse().find((m) => m.role === 'user')?.content ?? ''

  let searchContext = ''
  if (enableSearch && lastUserMsg.length > 5) {
    try {
      const results = await searchWeb(lastUserMsg, 3)
      if (results.length) {
        const blocks = results
          .map(
            (s, i) =>
              `<source index="${i + 1}" title="${s.title}" url="${s.url}">\n${s.snippet}\n</source>`
          )
          .join('\n\n')
        searchContext = `\n\n<Web search results>\n${blocks}\n</Web search results>`
      }
    } catch {}
  }

  const systemMessage = {
    role: 'system' as const,
    content:
      'You are a friendly voice assistant. ' +
      'Reply in 1-2 short sentences max. ' +
      'No markdown, no lists, no code. Just talk naturally. Under 25 words.',
  }

  const messages = [
    systemMessage,
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ]

  if (searchContext && messages.length > 1) {
    const lastIdx = messages.length - 1
    messages[lastIdx] = {
      ...messages[lastIdx],
      content: messages[lastIdx].content + searchContext,
    }
  }

  const raw = await chat({ model: DEFAULT_MODEL, messages, signal })

  let replyText = raw.trim()
  const lines = replyText.split('\n')
  const lastLine = lines[lines.length - 1]
  try {
    const parsed = JSON.parse(lastLine)
    if (parsed.emotion || parsed.intensity) {
      replyText = lines.slice(0, -1).join('\n').trim()
    }
  } catch {}

  replyText = replyText.replace(/\*\*/g, '').replace(/^[-*]\s/gm, '').trim()

  return { reply: replyText, emotion: 'neutral', intensity: 0.5 }
}
