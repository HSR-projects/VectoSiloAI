import { getCurrentUser } from "@/lib/auth";
import { clearGithubConnection } from "@/lib/appConnections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Remove the stored GitHub connection for the signed-in user. */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  await clearGithubConnection(user.id);
  return Response.json({ ok: true });
}
