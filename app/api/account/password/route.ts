import { NextResponse } from "next/server";
import { getCurrentUser, changePassword, AuthError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
    }

    await changePassword(user.id, currentPassword, newPassword);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof AuthError ? e.message : "Could not change password.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
