import { NextResponse } from "next/server";
import {
  getCurrentUser,
  getUserById,
  updateUser,
  updateUserRazorpay,
  fulfillCreditSession,
  getCredits,
} from "@/lib/auth";
import { razorpayInstance } from "@/lib/razorpay";
import { createGift } from "@/lib/gifts";
import { readDB as readOrgs, writeDB as writeOrgs } from "@/lib/orgs";
import type { Plan } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Called by the success page to verify and apply a plan upgrade or credit top-up. */
export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { sessionId } = (await req.json()) as { sessionId?: string };
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session ID." }, { status: 400 });
  }

  const order = await razorpayInstance.orders.fetch(sessionId);

  if (order.status !== "paid") {
    return NextResponse.json({ error: "Payment not completed." }, { status: 402 });
  }

  const userId = order.notes?.userId as string | undefined;
  const kind = order.notes?.kind as string | undefined;

  // Org-seat purchase: admin pays for employee's seat
  if (kind === "org-seat") {
    const targetUserId = order.notes?.targetUserId as string | undefined;
    const targetPlan = order.notes?.targetPlan as Plan | undefined;
    const orgId = order.notes?.orgId as string | undefined;
    if (!targetUserId || !targetPlan) {
      return NextResponse.json({ error: "Invalid org-seat order." }, { status: 400 });
    }
    if (!userId || userId !== current.id) {
      return NextResponse.json({ error: "Session mismatch." }, { status: 403 });
    }
    const target = await getUserById(targetUserId);
    if (!target) {
      return NextResponse.json({ error: "Target user not found." }, { status: 404 });
    }
    const updated = await updateUser(targetUserId, { plan: targetPlan });
    // Store the order ID on the member record for future refunds
    if (orgId) {
      const db = await readOrgs();
      const org = db.orgs.find((o) => o.id === orgId);
      if (org) {
        const member = org.members.find((m) => m.userId === targetUserId);
        if (member) {
          member.razorpayOrderId = sessionId;
          await writeOrgs(db);
        }
      }
    }
    return NextResponse.json({ kind: "org-seat", targetUser: updated });
  }

  if (!userId || userId !== current.id) {
    return NextResponse.json({ error: "Session mismatch." }, { status: 403 });
  }

  // ── Credit top-up (one-time payment) — separate from subscriptions ──
  if (order.notes?.kind === "credits") {
    const credits = parseInt((order.notes.credits as string) ?? "0", 10);
    if (credits > 0) await fulfillCreditSession(userId, sessionId, credits);
    const balance = await getCredits(userId);
    return NextResponse.json({ kind: "credits", credits: balance });
  }

  // ── Gift purchase ──
  if (order.notes?.kind === "gift") {
    const plan = order.notes?.plan as Plan;
    const toEmail = (order.notes?.toEmail as string) || undefined;
    const toName = (order.notes?.toName as string) || undefined;
    const gift = await createGift(plan, userId, current.name, toEmail);
    return NextResponse.json({ kind: "gift", gift });
  }

  // ── Subscription upgrade ──
  const plan = order.notes?.plan as Plan | undefined;
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const user = await updateUser(userId, { plan });

  await updateUserRazorpay(userId, {
    razorpayOrderId: sessionId,
    razorpaySubscriptionId: undefined,
  });

  return NextResponse.json({ user });
}
