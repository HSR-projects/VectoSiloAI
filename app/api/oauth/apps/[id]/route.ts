import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteClient } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const ok = await deleteClient(user.id, params.id);
  if (!ok) return NextResponse.json({ error: "App not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
