import { NextResponse } from "next/server";
import { getCurrentUser, getStoredUserById, saveStoredUser, AuthError } from "@/lib/auth";
import { encryptSecret, verifyTOTPCode, generateBackupCodes } from "@/lib/twoFactor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { secret, code } = await req.json();
    if (!secret || !code) {
      return NextResponse.json({ error: "Secret and verification code are required." }, { status: 400 });
    }

    // Verify the TOTP code against the generated secret
    if (!verifyTOTPCode(secret, code)) {
      return NextResponse.json({ error: "Invalid code. Try again." }, { status: 400 });
    }

    const stored = await getStoredUserById(user.id);
    if (!stored) return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Encrypt and store the secret, generate backup codes
    const encrypted = encryptSecret(secret);
    const backupCodes = generateBackupCodes();

    stored.twoFactorSecret = encrypted;
    stored.twoFactorEnabled = true;
    stored.twoFactorBackupCodes = backupCodes.hashes;
    await saveStoredUser(stored);

    return NextResponse.json({ ok: true, backupCodes: backupCodes.plain });
  } catch (e) {
    const msg = e instanceof AuthError ? e.message : "Could not enable 2FA.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
