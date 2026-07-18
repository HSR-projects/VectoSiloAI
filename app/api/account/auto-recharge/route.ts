import { NextResponse } from "next/server";
import { getCurrentUser, updateAutoRecharge } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { enabled, amountCents, thresholdCents } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid enabled flag" }, { status: 400 });
    }

    await updateAutoRecharge(user.id, enabled, amountCents, thresholdCents);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}