import { NextResponse } from "next/server";
import { loginUser, AuthError, EmailNotVerifiedError } from "@/lib/auth";
import { setSessionCookie } from "@/lib/authCookie";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = clientIp(req);

  // 20 attempts per IP per 15 minutes
  const ipRl = rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
  if (!ipRl.ok) {
    return NextResponse.json(
      { error: "Too many login attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  let email = "";
  try {
    const body = await req.json();
    email = (body.email ?? "").trim().toLowerCase();

    // 10 attempts per email per 15 minutes (catches credential stuffing against one account)
    const emailRl = rateLimit(`login:email:${email}`, 10, 15 * 60 * 1000);
    if (!emailRl.ok) {
      return NextResponse.json(
        { error: "Too many login attempts for this account. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const { user, token, twoFactorToken } = await loginUser(email, body.password);
    if (twoFactorToken) {
      return NextResponse.json({ user, needs2FA: true, twoFactorToken });
    }
    return setSessionCookie(NextResponse.json({ user }), token);
  } catch (e) {
    if (e instanceof EmailNotVerifiedError) {
      return NextResponse.json(
        { error: e.message, needsVerification: true, email: e.email },
        { status: 403 }
      );
    }
    const msg = e instanceof AuthError ? e.message : "Could not sign in.";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
