import { getCurrentUser } from "@/lib/auth";
import { githubAuthorizeUrl, githubOAuthConfigured, signState } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Start GitHub OAuth flow — returns redirect URL for the client to navigate to. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in first." }, { status: 401 });
  }
  if (!githubOAuthConfigured()) {
    return Response.json(
      { error: "GitHub is not configured. Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET." },
      { status: 503 }
    );
  }

  const base = (process.env.APP_URL || new URL(req.url).origin).replace(/\/+$/, "");
  const redirectUri = `${base}/api/apps/github/callback`;
  const url = githubAuthorizeUrl(signState(user.id), redirectUri);

  return Response.json({ url });
}