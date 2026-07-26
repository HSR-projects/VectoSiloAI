import { NextResponse } from "next/server";
import { getCurrentUser, readDB, writeDB } from "@/lib/auth";
import { razorpayInstance } from "@/lib/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Create a Razorpay customer and setup a recurring payment token (saved card).
 * We create a small order (e.g., $1.00) with `save_card: 1` or setup a subscription/token.
 */
export async function POST(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    // 1. Create or retrieve Razorpay Customer
    let customerId = "";
    const db = await readDB();
    const user = db.users.find((u) => u.id === current.id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.razorpayCustomerId) {
      customerId = user.razorpayCustomerId;
    } else {
      const customer = await razorpayInstance.customers.create({
        name: user.name,
        email: user.email,
        fail_existing: 0,
      });
      customerId = customer.id;
      user.razorpayCustomerId = customerId;
      await writeDB(db);
    }

    // 2. Create a verification order to save the card (e.g., $1.00 / 100 cents)
    const origin =
      process.env.APP_URL || req.headers.get("origin") || "http://localhost:3000";

    const order = await razorpayInstance.orders.create({
      amount: 100, // $1.00 verification charge
      currency: "USD",
      receipt: `savecard_${current.id.slice(0, 8)}`,
      notes: {
        userId: current.id,
        kind: "save_card",
      },
    });

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID!,
      name: "IncogniAI Save Card",
      description: "Verify and save your card for auto-recharge. This $1.00 will be credited to your balance.",
      prefill: {
        email: current.email,
      },
      callback_url: `${origin}/razorpay/success?order_id={ORDER_ID}&kind=save_card`,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const db = await readDB();
    const user = db.users.find((u) => u.id === current.id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    user.razorpayTokenId = undefined;
    user.autoRechargeEnabled = false;
    await writeDB(db);

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
