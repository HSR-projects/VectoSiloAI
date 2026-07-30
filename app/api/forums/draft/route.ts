import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { chat } from "@/lib/ollama";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const body = await req.json();
    const prompt = body.prompt;

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const response = await chat({
      model: "gpt-oss:20b",
      messages: [{ role: "user", content: prompt }]
    });

    return NextResponse.json({ text: response });
  } catch (e: any) {
    console.error("AI Draft Error:", e);
    return NextResponse.json({ error: "Failed to generate AI draft" }, { status: 500 });
  }
}
