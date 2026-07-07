import { NextResponse } from "next/server";
import { issuePasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { appBaseUrl } from "@/lib/verifyLink";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`forgot:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const token = await issuePasswordResetToken(email);
    if (token) {
      const base = appBaseUrl(req);
      const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(email, link).catch(() => {});
    }

    // Always return ok to avoid leaking whether the email exists.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not process request." }, { status: 500 });
  }
}
