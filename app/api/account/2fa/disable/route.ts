import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getCurrentUser, getStoredUserById, saveStoredUser, AuthError } from "@/lib/auth";
import { decryptSecret, verifyTOTPCode, verifyBackupCode } from "@/lib/twoFactor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { password, code } = await req.json();
    if (!password) return NextResponse.json({ error: "Password is required." }, { status: 400 });

    const stored = await getStoredUserById(user.id);
    if (!stored) return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Verify password
    const valid = stored.passwordHash
      ? await bcrypt.compare(password, stored.passwordHash)
      : false;
    if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 403 });

    // Verify TOTP or backup code
    let codeValid = false;
    if (code && stored.twoFactorSecret) {
      try {
        const secret = decryptSecret(stored.twoFactorSecret);
        codeValid = verifyTOTPCode(secret, code);
      } catch { /* fall through to backup code check */ }
    }

    // Try backup codes if TOTP didn't match
    if (!codeValid && code && stored.twoFactorBackupCodes?.length) {
      const result = verifyBackupCode(code, stored.twoFactorBackupCodes);
      if (result.ok) {
        codeValid = true;
        stored.twoFactorBackupCodes = result.remainingHashes;
      }
    }

    if (!codeValid) {
      return NextResponse.json({ error: "Invalid 2FA code or backup code." }, { status: 403 });
    }

    // Disable 2FA
    stored.twoFactorSecret = undefined;
    stored.twoFactorEnabled = false;
    stored.twoFactorBackupCodes = undefined;
    await saveStoredUser(stored);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof AuthError ? e.message : "Could not disable 2FA.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
