import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { requestJoinOrg, getOrg } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { orgId } = (await req.json()) as { orgId?: string };
  if (!orgId) {
    return NextResponse.json({ error: "Organization ID is required." }, { status: 400 });
  }

  try {
    const request = await requestJoinOrg(orgId, current.id, current.name, current.email);
    return NextResponse.json({ request });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
