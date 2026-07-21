import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { publishProject, getDiscoverEntries, likeDiscover } from "@/lib/teach/store";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { projectId, action } = body;

  if (!projectId || !action) {
    return NextResponse.json({ error: "projectId and action required" }, { status: 400 });
  }

  if (action === "publish") {
    const ok = publishProject(user.id, projectId, user.email || user.id);
    return NextResponse.json({ success: ok });
  }

  if (action === "like") {
    likeDiscover(projectId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET() {
  const entries = getDiscoverEntries();
  return NextResponse.json({ entries });
}
