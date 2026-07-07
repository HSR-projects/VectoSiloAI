import { NextResponse } from "next/server";
import { getStoredUserById, saveStoredUser, createSessionToken } from "@/lib/auth";
import { setSessionCookie } from "@/lib/authCookie";
import { verifyTwoFactorToken, decryptSecret, verifyTOTPCode, verifyBackupCode } from "@/lib/twoFactor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { twoFactorToken, code } = await req.json();
    if (!twoFactorToken || !code) {
      return NextResponse.json({ error: "Token and code are required." }, { status: 400 });
    }

    // Verify the short-lived 2FA token
    const userId = verifyTwoFactorToken(twoFactorToken);
    if (!userId) {
      return NextResponse.json({ error: "Expired or invalid session. Please sign in again." }, { status: 401 });
    }

    const stored = await getStoredUserById(userId);
    if (!stored || !stored.twoFactorSecret) {
      return NextResponse.json({ error: "2FA is not enabled for this account." }, { status: 400 });
    }

    // Verify TOTP code
    let codeValid = false;
    try {
      const secret = decryptSecret(stored.twoFactorSecret);
      codeValid = verifyTOTPCode(secret, code);
    } catch { /* fall through to backup code check */ }

    // Try backup codes if TOTP didn't match
    if (!codeValid && stored.twoFactorBackupCodes?.length) {
      const result = verifyBackupCode(code, stored.twoFactorBackupCodes);
      if (result.ok) {
        codeValid = true;
        stored.twoFactorBackupCodes = result.remainingHashes;
        await saveStoredUser(stored);
      }
    }

    if (!codeValid) {
      return NextResponse.json({ error: "Invalid 2FA code." }, { status: 403 });
    }

    // Issue the real session cookie
    const sessionToken = createSessionToken(userId);
    return setSessionCookie(NextResponse.json({ ok: true }), sessionToken);
  } catch {
    return NextResponse.json({ error: "Could not verify 2FA code." }, { status: 500 });
  }
}
