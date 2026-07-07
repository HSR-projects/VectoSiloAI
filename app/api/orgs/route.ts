import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOrg, getOrg, getOrgByOwner, getOrgByMember } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (current.plan !== "ultra") {
    return NextResponse.json({ error: "Ultra plan required." }, { status: 403 });
  }

  const { name } = (await req.json()) as { name?: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }

  try {
    const org = await createOrg(name, current.id, current.name, current.email);
    return NextResponse.json({ org });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function GET() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const org = await getOrgByOwner(current.id) || await getOrgByMember(current.id);
  return NextResponse.json({ org });
}
