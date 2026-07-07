import { getCurrentUser } from "@/lib/auth";
import { githubAuthorizeUrl, githubOAuthConfigured, signState } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kick off the GitHub OAuth flow — redirects the signed-in user to GitHub. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Sign in first.", { status: 401 });
  }
  if (!githubOAuthConfigured()) {
    return new Response(
      "GitHub is not configured. Set GITHUB_OAUTH_CLIENT_ID and GITHUB_OAUTH_CLIENT_SECRET.",
      { status: 503 }
    );
  }
  // Prefer the public APP_URL (the app runs behind a tunnel, so req.url's origin
  // can be the internal localhost). This must match the OAuth App's registered
  // Authorization callback URL exactly.
  const base = (process.env.APP_URL || new URL(req.url).origin).replace(/\/+$/, "");
  const redirectUri = `${base}/api/apps/github/callback`;
  const url = githubAuthorizeUrl(signState(user.id), redirectUri);
  return Response.redirect(url, 302);
}
