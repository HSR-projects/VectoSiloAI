import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getClientPublic, isValidRedirect, issueCode, sanitizeScope } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appendParams(uri: string, params: Record<string, string>): string {
  const url = new URL(uri);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return url.toString();
}

/** Validate an authorization request and return the consent details for the UI. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("client_id") ?? "";
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const responseType = searchParams.get("response_type") ?? "";

  const client = await getClientPublic(clientId);
  if (!client) return NextResponse.json({ error: "Unknown client application." }, { status: 400 });
  if (responseType !== "code") {
    return NextResponse.json({ error: "Unsupported response_type." }, { status: 400 });
  }
  if (!redirectUri || !(await isValidRedirect(clientId, redirectUri))) {
    return NextResponse.json({ error: "redirect_uri is not registered for this app." }, { status: 400 });
  }

  let redirectHost = redirectUri;
  try {
    redirectHost = new URL(redirectUri).host;
  } catch {
    /* keep raw */
  }

  return NextResponse.json({
    client: { clientId: client.clientId, name: client.name, logoUrl: client.logoUrl },
    scope: sanitizeScope(searchParams.get("scope")),
    redirectHost,
  });
}

/** Approve (or deny) consent and redirect back to the third-party app. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: {
    clientId?: string;
    redirectUri?: string;
    scope?: string;
    state?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    approve?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const clientId = body.clientId ?? "";
  const redirectUri = body.redirectUri ?? "";
  const state = body.state ?? "";

  const client = await getClientPublic(clientId);
  if (!client) return NextResponse.json({ error: "Unknown client application." }, { status: 400 });
  if (!(await isValidRedirect(clientId, redirectUri))) {
    return NextResponse.json({ error: "redirect_uri is not registered." }, { status: 400 });
  }

  if (!body.approve) {
    return NextResponse.json({
      redirect: appendParams(redirectUri, { error: "access_denied", state }),
    });
  }

  const code = await issueCode({
    clientId,
    userId: user.id,
    redirectUri,
    scope: sanitizeScope(body.scope),
    codeChallenge: body.codeChallenge || undefined,
    codeChallengeMethod: body.codeChallenge ? (body.codeChallengeMethod || "S256") : undefined,
  });

  return NextResponse.json({ redirect: appendParams(redirectUri, { code, state }) });
}
