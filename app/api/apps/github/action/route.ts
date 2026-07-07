import { getCurrentUser } from "@/lib/auth";
import { getGithubConnection } from "@/lib/appConnections";
import { executeGithubAction } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Execute one GitHub action on behalf of the signed-in user. Called by the chat
 * client after the model emits a `[[github:action]]` directive; the result is
 * fed back to the model for a natural-language summary.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const conn = await getGithubConnection(user.id);
  if (!conn) {
    return Response.json({ ok: false, error: "GitHub is not connected." }, { status: 400 });
  }

  let body: { action?: string; args?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const action = (body.action || "").trim();
  if (!action) return Response.json({ ok: false, error: "Missing action." }, { status: 400 });

  const result = await executeGithubAction(
    conn.accessToken,
    conn.login,
    action,
    body.args || {}
  );
  return Response.json(result);
}
