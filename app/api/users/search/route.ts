import { NextResponse } from "next/server";
import { readDB } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim().toLowerCase();
  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const db = await readDB();
  const results = db.users
    .filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
    )
    .slice(0, 10)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      plan: u.plan,
    }));

  return NextResponse.json({ users: results });
}
