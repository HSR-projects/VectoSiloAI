import { NextResponse } from "next/server";
import { resolveKoderSession, getKoderUsage } from "@/lib/koderUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 401 });

  const session = await resolveKoderSession(token);
  if (!session) return NextResponse.json({ error: "Invalid token." }, { status: 401 });

  const usage = await getKoderUsage(token);
  return NextResponse.json({ authType: session.authType, ...usage });
}
