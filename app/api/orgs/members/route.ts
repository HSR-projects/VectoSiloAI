import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrgByOwner, listOrgMembers, updateMemberStatus } from "@/lib/orgs";
import type { OrgMemberStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const org = await getOrgByOwner(current.id);
  if (!org) {
    return NextResponse.json({ error: "You don't own an organization." }, { status: 403 });
  }

  const members = await listOrgMembers(org.id, current.id);
  return NextResponse.json({ members, requests: org.requests });
}

export async function PATCH(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { userId, status } = (await req.json()) as { userId?: string; status?: OrgMemberStatus };
  if (!userId || !status) {
    return NextResponse.json({ error: "userId and status are required." }, { status: 400 });
  }

  const org = await getOrgByOwner(current.id);
  if (!org) {
    return NextResponse.json({ error: "You don't own an organization." }, { status: 403 });
  }

  try {
    const member = await updateMemberStatus(org.id, current.id, userId, status);
    return NextResponse.json({ member });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
