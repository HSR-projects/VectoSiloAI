import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { razorpayInstance, PLAN_PRICES, PLAN_NAMES, PLAN_DESCRIPTIONS } from "@/lib/razorpay";
import type { Plan } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAID_PLANS: Plan[] = ["go", "pro", "max", "ultra"];

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { plan } = (await req.json()) as { plan?: Plan };
  if (!plan || !PAID_PLANS.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const origin =
    process.env.APP_URL || req.headers.get("origin") || "http://localhost:3000";
  const amount = PLAN_PRICES[plan];

  const order = await razorpayInstance.orders.create({
    amount,
    currency: "USD",
    receipt: `plan_${plan}_${current.id.slice(0, 8)}`,
    notes: {
      userId: current.id,
      plan,
      kind: "subscription",
    },
  });

  return NextResponse.json({
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID!,
    name: PLAN_NAMES[plan],
    description: PLAN_DESCRIPTIONS[plan],
    prefill: {
      email: current.email,
    },
    callback_url: `${origin}/razorpay/success?order_id={ORDER_ID}&plan=${plan}`,
  });
}
