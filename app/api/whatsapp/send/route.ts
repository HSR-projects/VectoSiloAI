import { getCurrentUser } from "@/lib/auth";
import { effectiveCaps } from "@/lib/plans";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const caps = effectiveCaps(user.plan);
  if (!caps.computer) {
    return Response.json(
      { error: "WhatsApp integration requires Go plan or above." },
      { status: 402 }
    );
  }

  let body: { to: string; text: string; media?: { mimeType: string; data: string; filename?: string } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const { to, text, media } = body;
  if (!to || !text) {
    return Response.json({ error: "Missing 'to' or 'text'." }, { status: 400 });
  }

  const success = await sendWhatsAppMessage(user.id, to, text, media);
  if (!success) {
    return Response.json({ error: "Failed to send message. Not connected." }, { status: 500 });
  }

  return Response.json({ ok: true });
}