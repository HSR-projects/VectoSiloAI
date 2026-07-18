import { getCurrentUser } from "@/lib/auth";
import { slugExists, publishProject, getPublished } from "@/lib/published";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { slug?: string; title?: string; files?: { path: string; content: string }[]; commands?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-|-$/g, "");
  if (!slug || slug.length < 2 || slug.length > 64) {
    return Response.json({ error: "Slug must be 2-64 characters (lowercase letters, numbers, hyphens)." }, { status: 400 });
  }

  if (!body.files?.length) {
    return Response.json({ error: "No files to publish." }, { status: 400 });
  }

  if (await slugExists(slug)) {
    const existing = await getPublished(slug);
    if (existing && existing.userId !== user.id) {
      return Response.json({ error: "Slug already taken." }, { status: 409 });
    }
  }

  await publishProject(slug, body.title ?? "Untitled", body.files, body.commands ?? [], user.id);
  return Response.json({ ok: true, slug });
}
