import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STT_SERVER = "http://127.0.0.1:5050/transcribe";

export async function POST(req: Request) {
  const mime = req.headers.get("content-type") || "audio/webm";
  const body = await req.arrayBuffer();

  if (!body.byteLength) {
    return NextResponse.json({ error: "Empty audio body." }, { status: 400 });
  }

  try {
    const res = await fetch(STT_SERVER, {
      method: "POST",
      headers: { "Content-Type": mime },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[stt] STT server error:", err);
      return NextResponse.json({ error: "Transcription failed." }, { status: 500 });
    }

    const data = await res.json() as { text?: string };
    return NextResponse.json({ text: data.text ?? "" });
  } catch (e) {
    console.error("[stt] Cannot reach STT server:", e);
    return NextResponse.json({ error: "STT server unavailable." }, { status: 503 });
  }
}
