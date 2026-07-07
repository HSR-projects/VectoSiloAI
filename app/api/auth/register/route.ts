import { NextResponse } from "next/server";
import { registerUser, AuthError } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { verifyLink } from "@/lib/verifyLink";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 5 registration attempts per IP per hour
  const ip = clientIp(req);
  const rl = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many registration attempts. Try again in ${Math.ceil((rl.retryAfterSecs ?? 3600) / 60)} minutes.` },
      { status: 429 }
    );
  }

  try {
    const { name, email, password } = await req.json();
    const { user, verifyToken } = await registerUser(name, email, password);

    try {
      await sendVerificationEmail(user.email, user.name, verifyLink(req, verifyToken));
    } catch {
      return NextResponse.json(
        { error: "Account created, but we couldn't send the verification email. Try resending." },
        { status: 502 }
      );
    }

    return NextResponse.json({ needsVerification: true, email: user.email });
  } catch (e) {
    const msg = e instanceof AuthError ? e.message : "Could not create account.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
