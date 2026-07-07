import { NextResponse } from "next/server";
import { getCurrentUser, setUserFree } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Downgrade the current user to the Free plan.
 * This clears the user's paid plan status.
 * If you use Razorpay Subscriptions, you would cancel the subscription here.
 * If you use Razorpay Subscriptions, you would cancel the subscription here.
 */
export async function POST() {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Already free — nothing to cancel.
  if (current.plan === "free") {
    return NextResponse.json({ user: current, refunded: false, canceled: false });
  }

  const user = await setUserFree(current.id);
  return NextResponse.json({ user, refunded: false, canceled: true });
}
