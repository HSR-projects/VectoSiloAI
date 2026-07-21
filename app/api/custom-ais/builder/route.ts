import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { chat, DEFAULT_MODEL } from "@/lib/ollama";
import type { OllamaMessage } from "@/types";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are an expert Custom AI Builder. The user wants to create or update a custom AI personality/assistant.
Based on the conversation, first output your conversational reply to the user. Ask clarifying questions if needed.
Then, you MUST output the exact separator "====CONFIG====" on a new line.
Then, output a valid JSON object matching this exact schema for the AI:

{
  "name": "A catchy name",
  "description": "Short description",
  "instructions": "Full system instructions",
  "promptStarters": ["starter 1", "starter 2", "starter 3", "starter 4"]
}

Do not include markdown code blocks around the JSON.`;

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, model } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    const ollamaMessages: OllamaMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    // Note: VectoSiloAI's lib/ollama.ts exposes chatStream directly
    const { chatStream } = await import("@/lib/ollama");
    const stream = await chatStream({
      model: model || DEFAULT_MODEL,
      messages: ollamaMessages,
      options: { temperature: 0.7 },
      // We don't use format: "json" here because we are streaming mixed text and JSON
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (e: any) {
          controller.enqueue(encoder.encode(`\n[Error: ${e.message}]`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  } catch (err: any) {
    console.error("Builder API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
