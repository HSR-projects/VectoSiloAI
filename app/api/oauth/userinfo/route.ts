import { NextResponse } from "next/server";
import { getUserById } from "@/lib/auth";
import { verifyAccessToken } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OpenID-style userinfo endpoint. Authenticated with a Bearer access token; the
 * fields returned depend on the granted scope.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  const grant = await verifyAccessToken(token);
  if (!grant) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const user = await getUserById(grant.userId);
  if (!user) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const scopes = grant.scope.split(" ");
  const payload: Record<string, unknown> = { sub: user.id };
  if (scopes.includes("profile") || scopes.includes("openid")) {
    payload.name = user.name;
    payload.picture = (user as { googlePicture?: string }).googlePicture ?? undefined;
  }
  if (scopes.includes("email") || scopes.includes("openid")) {
    payload.email = user.email;
    payload.email_verified = user.emailVerified;
  }

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
