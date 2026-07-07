import { exchangeCode, getViewer, verifyState } from "@/lib/github";
import { setGithubConnection } from "@/lib/appConnections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GitHub OAuth redirect target: exchange the code, store the token, bounce home. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  // Use the public base (matches what /connect sent to GitHub and what's
  // registered on the OAuth App); fall back to the request origin.
  const base = (process.env.APP_URL || url.origin).replace(/\/+$/, "");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  const home = (status: string) => Response.redirect(`${base}/?github=${status}`, 302);

  if (err) return home("denied");
  const userId = verifyState(state);
  if (!userId || !code) return home("error");

  try {
    const redirectUri = `${base}/api/apps/github/callback`;
    const { accessToken, scope } = await exchangeCode(code, redirectUri);
    const viewer = await getViewer(accessToken);
    await setGithubConnection(userId, {
      accessToken,
      scope,
      login: viewer.login,
      name: viewer.name,
      avatarUrl: viewer.avatar_url,
      connectedAt: Date.now(),
    });
    return home("connected");
  } catch {
    return home("error");
  }
}
