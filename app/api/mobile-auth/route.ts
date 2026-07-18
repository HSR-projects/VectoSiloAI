import { NextResponse } from "next/server";
import { getCurrentUser, createSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a fresh session token for the mobile app to use
    // Using the exact same createSessionToken used for web sessions,
    // so the mobile app can just pass it as a Bearer token or cookie.
    const token = createSessionToken(user.id);

    return NextResponse.json({ success: true, token });
  } catch (err: any) {
    console.error("Mobile auth error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
