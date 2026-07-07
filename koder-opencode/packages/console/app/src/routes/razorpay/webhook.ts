import { Billing } from "@opencode-ai/console-core/billing.js"
import type { APIEvent } from "@solidjs/start/server"
import { and, Database, eq, sql } from "@opencode-ai/console-core/drizzle/index.js"
import { BillingTable, LiteTable, PaymentTable } from "@opencode-ai/console-core/schema/billing.sql.js"
import { Identifier } from "@opencode-ai/console-core/identifier.js"
import { centsToMicroCents } from "@opencode-ai/console-core/util/price.js"
import { Actor } from "@opencode-ai/console-core/actor.js"
import { Resource } from "@opencode-ai/console-resource"
import { LiteData } from "@opencode-ai/console-core/lite.js"
import { BlackData } from "@opencode-ai/console-core/black.js"
import { Referral } from "@opencode-ai/console-core/referral.js"
import { createHmac } from "node:crypto"

function verifyRazorpaySignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex")
  return expected === signature
}

export async function POST(input: APIEvent) {
  const body = await input.request.text()
  const sig = input.request.headers.get("x-razorpay-signature") || ""

  if (!verifyRazorpaySignature(body, sig, Resource.RAZORPAY_WEBHOOK_SECRET.value)) {
    return Response.json({ message: "Invalid signature." }, { status: 400 })
  }

  const event = JSON.parse(body)
  console.log(event.event, JSON.stringify(event, null, 2))

  return (async () => {
    if (event.event === "payment_link.paid") {
      const pl = event.payload.payment_link.entity
      const plNotes = pl.notes || {}
      const workspaceID = plNotes.workspaceID
      const amountInCents = parseInt(plNotes.amount || "0", 10)

      if (!workspaceID || !amountInCents) return "ignored"

      await Actor.provide("system", { workspaceID }, async () => {
        await Database.transaction(async (tx) => {
          await tx
            .update(BillingTable)
            .set({
              balance: sql`${BillingTable.balance} + ${centsToMicroCents(amountInCents)}`,
            })
            .where(eq(BillingTable.workspaceID, workspaceID))
          await tx.insert(PaymentTable).values({
            workspaceID,
            id: Identifier.create("payment"),
            amount: centsToMicroCents(amountInCents),
            paymentID: pl.id,
            invoiceID: pl.id,
            customerID: undefined,
          })
        })
      })
    }

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity
      const notes = payment.notes || {}
      const workspaceID = notes.workspaceID
      const amountInCents = parseInt(notes.amount || "0", 10)
      const orderID = payment.order_id

      if (!workspaceID || !amountInCents) return "ignored"

      await Actor.provide("system", { workspaceID }, async () => {
        await Database.transaction(async (tx) => {
          await tx
            .update(BillingTable)
            .set({
              balance: sql`${BillingTable.balance} + ${centsToMicroCents(amountInCents)}`,
              customerID: payment.contact || payment.email,
            })
            .where(eq(BillingTable.workspaceID, workspaceID))
          await tx.insert(PaymentTable).values({
            workspaceID,
            id: Identifier.create("payment"),
            amount: centsToMicroCents(amountInCents),
            paymentID: payment.id,
            invoiceID: orderID || payment.id,
            customerID: payment.contact || payment.email,
          })
        })
      })
    }

    if (event.event === "order.paid") {
      const order = event.payload.order.entity
      const notes = order.notes || {}
      const workspaceID = notes.workspaceID
      const amountInCents = parseInt(notes.amount || "0", 10)

      if (!workspaceID || !amountInCents) return "ignored"

      await Actor.provide("system", { workspaceID }, async () => {
        const customer = await Billing.get()
        if (!customer?.customerID) {
          await Database.use((tx) =>
            tx
              .update(BillingTable)
              .set({
                customerID: order.id,
              })
              .where(eq(BillingTable.workspaceID, workspaceID)),
          )
        }
      })
    }

    if (event.event === "subscription.activated") {
      const subscription = event.payload.subscription.entity
      const notes = subscription.notes || {}
      const type = notes.type

      if (type === "lite") {
        const workspaceID = notes.workspaceID
        const userID = notes.userID
        const userEmail = notes.userEmail
        const subscriptionID = subscription.id

        if (!workspaceID || !userID) return "ignored"

        await Actor.provide("system", { workspaceID }, async () => {
          await Database.transaction(async (tx) => {
            await tx
              .update(BillingTable)
              .set({
                liteSubscriptionID: subscriptionID,
                lite: {},
              })
              .where(eq(BillingTable.workspaceID, workspaceID))

            await tx.insert(LiteTable).values({
              workspaceID,
              id: Identifier.create("lite"),
              userID,
            })
          })

          await Referral.completeFromLiteSubscription({
            workspaceID,
            userID,
          }).catch((error) => {
            console.error("Referral sync failed", error)
          })
        })
      }
    }

    if (event.event === "subscription.cancelled") {
      const subscription = event.payload.subscription.entity
      const subscriptionID = subscription.id
      const notes = subscription.notes || {}

      if (notes.type === "lite") {
        await Billing.unsubscribeLite({ subscriptionID })
      } else {
        await Billing.unsubscribeBlack({ subscriptionID })
      }
    }

    if (event.event === "refund.created") {
      const refund = event.payload.refund.entity
      const paymentID = refund.payment_id

      if (!paymentID) return "ignored"

      const payment = await Database.use((tx) =>
        tx
          .select({
            workspaceID: PaymentTable.workspaceID,
            amount: PaymentTable.amount,
            enrichment: PaymentTable.enrichment,
          })
          .from(PaymentTable)
          .where(eq(PaymentTable.paymentID, paymentID))
          .then((rows) => rows[0]),
      )
      if (!payment) return "ignored"

      await Database.transaction(async (tx) => {
        await tx
          .update(PaymentTable)
          .set({
            timeRefunded: new Date(),
          })
          .where(eq(PaymentTable.paymentID, paymentID))

        if (!payment.enrichment?.type) {
          await tx
            .update(BillingTable)
            .set({
              balance: sql`${BillingTable.balance} - ${payment.amount}`,
            })
            .where(eq(BillingTable.workspaceID, payment.workspaceID))
        }
      })
    }
  })()
    .then((message) => {
      return Response.json({ message: message ?? "done" }, { status: 200 })
    })
    .catch((error: any) => {
      return Response.json({ message: error.message }, { status: 500 })
    })
}
