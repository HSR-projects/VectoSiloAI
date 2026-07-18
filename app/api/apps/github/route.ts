import { getCurrentUser } from "@/lib/auth";
import { getGithubConnection } from "@/lib/appConnections";
import { githubOAuthConfigured } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Report whether the signed-in user has GitHub connected (never the token). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ connected: false, configured: githubOAuthConfigured() });
  }
  const conn = await getGithubConnection(user.id);
  return Response.json({
    configured: githubOAuthConfigured(),
    connected: !!conn,
    login: conn?.login ?? null,
    name: conn?.name ?? null,
    avatarUrl: conn?.avatarUrl ?? null,
    scope: conn?.scope ?? null,
  });
}

/** Disconnect GitHub */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { clearGithubConnection } = await import("@/lib/appConnections");
  await clearGithubConnection(user.id);
  return Response.json({ ok: true });
}