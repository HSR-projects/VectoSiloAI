import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { razorpayInstance, PLAN_PRICES, PLAN_NAMES } from "@/lib/razorpay";
import type { Plan } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GIFTABLE: Plan[] = ["pro", "max"];

export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { plan, toEmail, toName } = (await req.json()) as {
    plan?: Plan;
    toEmail?: string;
    toName?: string;
  };
  if (!plan || !GIFTABLE.includes(plan)) {
    return NextResponse.json({ error: "Only Pro and Max can be gifted." }, { status: 400 });
  }

  const origin =
    process.env.APP_URL || req.headers.get("origin") || "http://localhost:3000";
  const amount = PLAN_PRICES[plan];

  const order = await razorpayInstance.orders.create({
    amount,
    currency: "USD",
    receipt: `gift_${plan}_${current.id.slice(0, 8)}`,
    notes: {
      userId: current.id,
      plan,
      kind: "gift",
      toEmail: toEmail || "",
      toName: toName || "",
    },
  });

  return NextResponse.json({
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID!,
    name: `Gift: ${PLAN_NAMES[plan]}`,
    description: `Gift ${PLAN_NAMES[plan]} to ${toName || toEmail || "someone"}`,
    prefill: { email: current.email },
    callback_url: `${origin}/razorpay/success?order_id={ORDER_ID}&plan=${plan}&kind=gift`,
  });
}
