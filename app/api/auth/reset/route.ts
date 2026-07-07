import { NextResponse } from "next/server";
import { resetPassword, AuthError } from "@/lib/auth";
import { setSessionCookie } from "@/lib/authCookie";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`reset:ip:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
    }

    const { user, token: sessionToken } = await resetPassword(token, newPassword);
    return setSessionCookie(NextResponse.json({ user }), sessionToken);
  } catch (e) {
    const msg = e instanceof AuthError ? e.message : "Could not reset password.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
