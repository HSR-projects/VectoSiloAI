import {
  getCurrentUser,
  getUserMemory,
  updateUserMemory,
  addMemory,
  deleteMemory,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Read the signed-in user's memory + personalization. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  return Response.json(await getUserMemory(user.id));
}

/** Update personalization fields or the memory toggle. */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  let body: { memoryEnabled?: boolean; aboutYou?: string; responsePrefs?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  return Response.json(await updateUserMemory(user.id, body));
}

/** Append a saved memory (used by the chat auto-memory directive and manual add). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!body.text?.trim()) return Response.json({ memories: (await getUserMemory(user.id)).memories });
  const memories = await addMemory(user.id, body.text);
  return Response.json({ memories });
}

/** Delete one memory (?id=) or all (no id). */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || undefined;
  const memories = await deleteMemory(user.id, id);
  return Response.json({ memories });
}
