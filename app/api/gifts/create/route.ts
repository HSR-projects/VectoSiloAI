import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createGift } from "@/lib/gifts";
import type { Plan } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { plan, toEmail } = (await req.json()) as { plan?: Plan; toEmail?: string };
  if (!plan || !["pro", "max"].includes(plan)) {
    return NextResponse.json({ error: "Only Pro and Max can be gifted." }, { status: 400 });
  }

  try {
    const gift = await createGift(plan, current.id, current.name, toEmail);
    return NextResponse.json({ gift });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
