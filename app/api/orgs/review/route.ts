import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOrgByOwner, reviewJoinRequest } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { requestId, approve, plan } = (await req.json()) as { requestId?: string; approve?: boolean; plan?: string };
  if (!requestId || typeof approve !== "boolean") {
    return NextResponse.json({ error: "requestId and approve are required." }, { status: 400 });
  }

  const org = await getOrgByOwner(current.id);
  if (!org) {
    return NextResponse.json({ error: "You don't own an organization." }, { status: 403 });
  }

  try {
    const req = await reviewJoinRequest(org.id, requestId, current.id, approve, plan);
    return NextResponse.json({ request: req });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
