import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createShareLink, revokeShareLink, getShareByThread } from "@/lib/shares";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { threadId } = (await req.json()) as { threadId?: string };
  if (!threadId) {
    return NextResponse.json({ error: "threadId is required." }, { status: 400 });
  }

  try {
    const share = await createShareLink(threadId, current.id);
    const url = `${process.env.APP_URL || req.headers.get("origin") || "http://localhost:3000"}/share/${share.id}`;
    return NextResponse.json({ share, url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { threadId } = (await req.json()) as { threadId?: string };
  if (!threadId) {
    return NextResponse.json({ error: "threadId is required." }, { status: 400 });
  }

  await revokeShareLink(threadId, current.id);
  return NextResponse.json({ ok: true });
}
