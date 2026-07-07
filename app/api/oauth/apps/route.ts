import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient, listClients } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const apps = await listClients(user.id);
  return NextResponse.json({ apps });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: { name?: string; redirectUris?: string[]; logoUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const redirectUris = (body.redirectUris ?? [])
    .map((u) => u.trim())
    .filter(Boolean);

  if (!name) return NextResponse.json({ error: "App name is required." }, { status: 400 });
  if (redirectUris.length === 0) {
    return NextResponse.json({ error: "At least one redirect URI is required." }, { status: 400 });
  }
  // Redirect URIs must be absolute http(s) URLs.
  for (const uri of redirectUris) {
    try {
      const u = new URL(uri);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
    } catch {
      return NextResponse.json({ error: `Invalid redirect URI: ${uri}` }, { status: 400 });
    }
  }

  const { client, secret } = await createClient(user.id, name, redirectUris, body.logoUrl);
  // The plaintext secret is returned exactly once, here.
  return NextResponse.json({ app: client, clientSecret: secret });
}
