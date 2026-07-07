import { NextResponse } from "next/server";
import { getCurrentUser, getUserById } from "@/lib/auth";
import { getOrgByOwner } from "@/lib/orgs";
import { razorpayInstance, PLAN_PRICES, PLAN_NAMES, PLAN_DESCRIPTIONS } from "@/lib/razorpay";
import type { Plan } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { targetUserId, plan } = (await req.json()) as { targetUserId?: string; plan?: Plan };
  if (!targetUserId || !plan || (plan !== "pro" && plan !== "max")) {
    return NextResponse.json({ error: "Invalid request. Must specify targetUserId and plan (pro/max)." }, { status: 400 });
  }

  const org = await getOrgByOwner(current.id);
  if (!org) {
    return NextResponse.json({ error: "You don't own an organization." }, { status: 403 });
  }

  const target = await getUserById(targetUserId);
  if (!target) {
    return NextResponse.json({ error: "Target user not found." }, { status: 404 });
  }

  const origin =
    process.env.APP_URL || req.headers.get("origin") || "http://localhost:3000";
  const amount = PLAN_PRICES[plan];

  const order = await razorpayInstance.orders.create({
    amount,
    currency: "USD",
    receipt: `org_seat_${plan}_${current.id.slice(0, 8)}_${targetUserId.slice(0, 8)}`,
    notes: {
      userId: current.id,
      targetUserId,
      targetPlan: plan,
      orgId: org.id,
      kind: "org-seat",
    },
  });

  return NextResponse.json({
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID!,
    name: `Org seat — ${PLAN_NAMES[plan]}`,
    description: `${PLAN_NAMES[plan]} for ${target.email}`,
    prefill: { email: current.email },
    callback_url: `${origin}/razorpay/success?order_id={ORDER_ID}&kind=org-seat&targetUserId=${targetUserId}&plan=${plan}`,
  });
}
