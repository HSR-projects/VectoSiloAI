import { NextResponse } from "next/server";
import { getPublicAIs, publishCustomAI } from "@/lib/customAIsStore";
import { getCurrentUser } from "@/lib/auth";
import type { PublicCustomAI } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ais = await getPublicAIs();
    return NextResponse.json({ ais });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ai: PublicCustomAI = await req.json();
    if (!ai || !ai.id || !ai.name || !ai.instructions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Attach author info
    ai.authorId = user.id;
    ai.authorName = user.name;

    await publishCustomAI(ai);

    return NextResponse.json({ success: true, ai });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
