import { getPublished } from "@/lib/published";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const project = await getPublished(slug);
  if (!project) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  return Response.json({
    slug: project.slug,
    title: project.title,
    files: project.files,
    commands: project.commands,
    createdAt: project.createdAt,
  });
}
