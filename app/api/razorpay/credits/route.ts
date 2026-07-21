import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { razorpayInstance } from "@/lib/razorpay";
import { creditPack } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Start a Razorpay order to buy API credits.
 *
 * API credits are pay-as-you-go and entirely separate from the Pro/Max plan.
 */
export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { packId } = (await req.json()) as { packId?: string };
  const pack = packId ? creditPack(packId) : undefined;
  if (!pack) {
    return NextResponse.json({ error: "Invalid credit pack." }, { status: 400 });
  }

  const origin =
    process.env.APP_URL || req.headers.get("origin") || "http://localhost:3000";

  const order = await razorpayInstance.orders.create({
    amount: Math.round(pack.usd * 100), // USD cents
    currency: "USD",
    receipt: `credits_${pack.id}_${current.id.slice(0, 8)}`,
    notes: {
      userId: current.id,
      kind: "credits",
      packId: pack.id,
      credits: String(pack.credits),
    },
  });

  return NextResponse.json({
    id: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID!,
    name: `VectoSiloAI API Credits — ${pack.label}`,
    description: `${pack.credits} credits ($${pack.usd.toFixed(2)}) for the VectoSiloAI API. Credits never expire.`,
    prefill: {
      email: current.email,
    },
    callback_url: `${origin}/razorpay/success?order_id={ORDER_ID}&kind=credits`,
  });
}
