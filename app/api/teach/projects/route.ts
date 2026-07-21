import { NextRequest, NextResponse } from "next/server";
import {
  createProject, getUserProjects, getProject, updateProject, deleteProject, canCreateProject,
} from "@/lib/teach/store";
import { getCurrentUser } from "@/lib/auth";
import { effectiveCaps } from "@/lib/plans";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const projects = getUserProjects(user.id);
  return NextResponse.json({ projects, count: projects.length, limit: effectiveCaps(user.plan).desktop ? Infinity : 5 });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.name || !body.type) {
    return NextResponse.json({ error: "Name and type required" }, { status: 400 });
  }

  const check = canCreateProject(user.id, user.plan);
  if (!check.allowed) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  const project = createProject(user.id, body);
  return NextResponse.json({ project }, { status: 201 });
}
