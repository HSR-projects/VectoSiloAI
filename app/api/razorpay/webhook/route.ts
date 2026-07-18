import { NextResponse } from "next/server";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { updateUser, updateUserRazorpay, fulfillCreditSession } from "@/lib/auth";
import type { Plan } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("x-razorpay-signature");

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (secret && sig) {
    try {
      validateWebhookSignature(body, sig, secret);
    } catch {
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }
  }

  const event = JSON.parse(body);

  if (event.event === "order.paid" || event.event === "payment.captured") {
    const order = event.payload?.order?.entity || event.payload?.payment?.entity;

    const userId = order?.notes?.userId as string | undefined;
    const kind = order?.notes?.kind as string | undefined;
    const sessionId = order?.id as string | undefined;

    if (!userId || !sessionId) {
      return NextResponse.json({ ok: true });
    }

    // ── API credits (one-time payment) — independent of subscription ──
    if (kind === "credits") {
      const credits = parseInt((order.notes?.credits as string) ?? "0", 10);
      if (credits > 0) {
        await fulfillCreditSession(userId, sessionId, credits);
      }
      return NextResponse.json({ ok: true });
    }

    // ── Save Card verification ──
    if (kind === "save_card") {
      await fulfillCreditSession(userId, sessionId, 100);
      
      // Fetch payment token if available
      const paymentToken = event.payload?.payment?.entity?.token_id;
      if (paymentToken) {
        const { readDB, writeDB } = require("@/lib/auth");
        const db = await readDB();
        const user = db.users.find((u: any) => u.id === userId);
        if (user) {
          user.razorpayTokenId = paymentToken;
          await writeDB(db);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // ── Subscription upgrade ──
    const plan = order.notes?.plan as Plan | undefined;
    if (plan && (plan === "go" || plan === "pro" || plan === "max" || plan === "ultra")) {
      await updateUser(userId, { plan });
      
      // Add $1.00 (100 cents) free credit perk for Max or Ultra plans
      if (plan === "max" || plan === "ultra") {
        await fulfillCreditSession(userId, `perk_${sessionId}`, 100);
      }

      await updateUserRazorpay(userId, {
        razorpayOrderId: sessionId,
        razorpaySubscriptionId: undefined,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
