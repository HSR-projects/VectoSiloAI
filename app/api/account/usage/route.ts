import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUsage, type UsageRange } from "@/lib/usageStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RANGES: UsageRange[] = ["24h", "7d", "30d", "90d"];

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const raw = new URL(req.url).searchParams.get("range") as UsageRange | null;
  const range: UsageRange = raw && RANGES.includes(raw) ? raw : "24h";

  const usage = await getUsage(user.id, range);
  return NextResponse.json(usage);
}
