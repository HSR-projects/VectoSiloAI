import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listUserGifts } from "@/lib/gifts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const gifts = await listUserGifts(current.id);
  return NextResponse.json({ gifts });
}
