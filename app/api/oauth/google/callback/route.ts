import { redirect } from "next/navigation";
import { setGoogleConnection, GoogleConnection } from "@/lib/appConnections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const base = (process.env.APP_URL || url.origin).replace(/\/+$/, "");

  if (error || !code) {
    console.error("Google OAuth error:", error);
    return redirect(`${base}/connectors?error=oauth_failed`);
  }

  let userId: string | null = null;
  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
      userId = parsed.userId;
    } catch (e) {
      console.error("Failed to parse state:", e);
    }
  }

  if (!userId) {
    return redirect(`${base}/connectors?error=no_user`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${base}/api/oauth/google/callback`;

  if (!clientId || !clientSecret) {
    return redirect(`${base}/connectors?error=not_configured`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errTxt = await tokenRes.text();
      console.error("Token exchange failed:", errTxt);
      return redirect(`${base}/connectors?error=token_exchange_failed`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token; // only present on first auth or if prompt=consent
    const scopes = tokenData.scope || "";

    // Fetch user profile info
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      console.error("Profile fetch failed:", await profileRes.text());
      return redirect(`${base}/connectors?error=profile_fetch_failed`);
    }

    const profileData = await profileRes.json();

    const conn: GoogleConnection = {
      accessToken,
      refreshToken,
      scope: scopes,
      email: profileData.email,
      name: profileData.name,
      avatarUrl: profileData.picture,
      connectedAt: Date.now(),
    };

    await setGoogleConnection(userId, conn);

    return redirect(`${base}/connectors?success=google_connected`);
  } catch (error) {
    console.error("Google OAuth error:", error);
    return redirect(`${base}/connectors?error=internal_error`);
  }
}
