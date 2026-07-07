import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getCurrentUser, getStoredUserById, saveStoredUser, AuthError } from "@/lib/auth";
import {
  generateTwoFactorSecret,
  getOTPAuthURL,
  generateQRCodeDataURL,
  encryptSecret,
} from "@/lib/twoFactor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { password } = await req.json();
    if (!password) return NextResponse.json({ error: "Password is required." }, { status: 400 });

    const stored = await getStoredUserById(user.id);
    if (!stored) return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Verify password
    const valid = stored.passwordHash
      ? await bcrypt.compare(password, stored.passwordHash)
      : false;
    if (!valid) return NextResponse.json({ error: "Incorrect password." }, { status: 403 });

    // Generate new secret
    const secret = generateTwoFactorSecret();
    const otpauthURL = getOTPAuthURL(secret, stored.email);
    const qrCode = await generateQRCodeDataURL(otpauthURL);

    return NextResponse.json({ secret, qrCode, otpauthURL });
  } catch (e) {
    const msg = e instanceof AuthError ? e.message : "Could not set up 2FA.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
