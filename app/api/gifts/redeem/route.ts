import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { redeemGift } from "@/lib/gifts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { code } = (await req.json()) as { code?: string };
  if (!code?.trim()) {
    return NextResponse.json({ error: "Gift code is required." }, { status: 400 });
  }

  try {
    const result = await redeemGift(code, current.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
