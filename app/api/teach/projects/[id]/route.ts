import { NextRequest, NextResponse } from "next/server";
import { getProject, updateProject, deleteProject, addClass, removeClass } from "@/lib/teach/store";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = getProject(user.id, params.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ project });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const project = getProject(user.id, params.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  if (body.name) project.name = body.name;
  if (body.description !== undefined) project.description = body.description;
  if (body.addClass) addClass(project, body.addClass);
  if (body.removeClass) removeClass(project, body.removeClass);
  if (body.trained !== undefined) project.trained = body.trained;
  updateProject(project);

  return NextResponse.json({ project });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = deleteProject(user.id, params.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
