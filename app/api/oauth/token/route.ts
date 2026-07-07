import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/**
 * OAuth 2.0 token endpoint. Accepts the standard `application/x-www-form-urlencoded`
 * body (and JSON, for convenience). Client auth via HTTP Basic header or
 * client_id/client_secret in the body, or PKCE code_verifier for public clients.
 */
export async function POST(req: Request) {
  const params = await parseBody(req);

  if (params.grant_type !== "authorization_code") {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400, headers: noStore });
  }

  // Client credentials may arrive via HTTP Basic auth.
  let clientId = params.client_id;
  let clientSecret = params.client_secret;
  const basic = req.headers.get("authorization");
  if (basic?.startsWith("Basic ")) {
    try {
      const [id, secret] = Buffer.from(basic.slice(6), "base64").toString("utf8").split(":");
      clientId = clientId || id;
      clientSecret = clientSecret || secret;
    } catch {
      /* ignore malformed header */
    }
  }

  if (!params.code || !clientId || !params.redirect_uri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: noStore });
  }

  const result = await exchangeCode({
    code: params.code,
    clientId,
    clientSecret,
    redirectUri: params.redirect_uri,
    codeVerifier: params.code_verifier,
  });

  if (!result.ok) {
    const status = result.error === "invalid_client" ? 401 : 400;
    return NextResponse.json({ error: result.error }, { status, headers: noStore });
  }

  return NextResponse.json(result.token, { headers: noStore });
}

async function parseBody(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const j = await req.json();
      return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v ?? "")]));
    }
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text));
  } catch {
    return {};
  }
}
