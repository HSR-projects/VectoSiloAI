import { NextResponse } from "next/server";
import { getSharedThread } from "@/lib/shares";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await getSharedThread(id);
  if (!result) {
    return NextResponse.json({ error: "Share not found." }, { status: 404 });
  }
  return NextResponse.json(result);
}
