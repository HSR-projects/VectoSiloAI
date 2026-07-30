import { NextResponse } from "next/server";
import { chatStream } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let query = "";
  let context = "";
  try {
    ({ query, context } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!query?.trim()) {
    return NextResponse.json({ error: "Missing query." }, { status: 400 });
  }

  const prompt = `You are a concise search assistant. Provide a highly accurate, brief overview answering the user's query using ONLY the provided search results context. Do not invent information. Format it nicely using markdown. Keep it under 150 words.

User Query: ${query}
Search Context:
${context}`;

  try {
    const stream = await chatStream({
      model: "gpt-oss:120b",
      messages: [{ role: "user", content: prompt }],
    });

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch (e) {
          console.error("Overview stream error:", e);
          controller.error(e);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "Overview generation failed." }, { status: 500 });
  }
}
