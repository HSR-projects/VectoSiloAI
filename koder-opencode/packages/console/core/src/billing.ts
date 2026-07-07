import Razorpay from "razorpay"
import { and, Database, eq, isNull, sql } from "./drizzle"
import {
  BillingTable,
  CouponTable,
  CouponType,
  LiteTable,
  PaymentTable,
  SubscriptionTable,
  UsageTable,
} from "./schema/billing.sql"
import { Actor } from "./actor"
import { fn } from "./util/fn"
import { z } from "zod"
import { Resource } from "@opencode-ai/console-resource"
import { Identifier } from "./identifier"
import { centsToMicroCents } from "./util/price"
import { User } from "./user"
import { BlackData } from "./black"
import { LiteData } from "./lite"

export namespace Billing {
  export const ITEM_CREDIT_NAME = "opencode credits"
  export const ITEM_FEE_NAME = "processing fee"
  export const RELOAD_AMOUNT = 20
  export const RELOAD_AMOUNT_MIN = 10
  export const RELOAD_TRIGGER = 5
  export const RELOAD_TRIGGER_MIN = 5

  let _razorpay: Razorpay | null = null
  export const razorpay = () => {
    if (!_razorpay) {
      _razorpay = new Razorpay({
        key_id: Resource.RAZORPAY_KEY_ID.value,
        key_secret: Resource.RAZORPAY_KEY_SECRET.value,
      })
    }
    return _razorpay
  }

  export const get = async () => {
    return Database.use(async (tx) =>
      tx
        .select()
        .from(BillingTable)
        .where(eq(BillingTable.workspaceID, Actor.workspace()))
        .then((r) => r[0]),
    )
  }

  export const payments = async () => {
    return await Database.use((tx) =>
      tx
        .select()
        .from(PaymentTable)
        .where(eq(PaymentTable.workspaceID, Actor.workspace()))
        .orderBy(sql`${PaymentTable.timeCreated} DESC`)
        .limit(100),
    )
  }

  export const usages = async (page = 0, pageSize = 50) => {
    return await Database.use((tx) =>
      tx
        .select()
        .from(UsageTable)
        .where(eq(UsageTable.workspaceID, Actor.workspace()))
        .orderBy(sql`${UsageTable.timeCreated} DESC`)
        .limit(pageSize)
        .offset(page * pageSize),
    )
  }

  export const calculateFeeInCents = (x: number) => {
    return Math.round(((x + 30) / 0.956) * 0.044 + 30)
  }

  export const reload = async () => {
    const billing = await Database.use((tx) =>
      tx
        .select({
          customerID: BillingTable.customerID,
          paymentMethodID: BillingTable.paymentMethodID,
          reloadAmount: BillingTable.reloadAmount,
        })
        .from(BillingTable)
        .where(eq(BillingTable.workspaceID, Actor.workspace()))
        .then((rows) => rows[0]),
    )
    const customerID = billing.customerID
    const amountInCents = (billing.reloadAmount ?? Billing.RELOAD_AMOUNT) * 100
    try {
      const order = await Billing.razorpay().orders.create({
        amount: amountInCents + calculateFeeInCents(amountInCents),
        currency: "INR",
        receipt: `reload_${Actor.workspace().slice(0, 8)}`,
        notes: {
          workspaceID: Actor.workspace(),
          amount: amountInCents.toString(),
        },
      })
      const payment = await Billing.razorpay().payments.fetch(order.id)
      if (payment.status === "captured") {
        await Database.use((tx) =>
          tx
            .update(BillingTable)
            .set({
              balance: sql`${BillingTable.balance} + ${centsToMicroCents(amountInCents)}`,
            })
            .where(eq(BillingTable.workspaceID, Actor.workspace())),
        )
      }
    } catch (e: any) {
      console.error(e)
      await Database.use((tx) =>
        tx
          .update(BillingTable)
          .set({
            reload: false,
            reloadError: e.message ?? "Payment failed.",
            timeReloadError: sql`now()`,
          })
          .where(eq(BillingTable.workspaceID, Actor.workspace())),
      )
    }
  }

  export const grantCredit = async (workspaceID: string, dollarAmount: number) => {
    const amountInMicroCents = centsToMicroCents(dollarAmount * 100)
    await Database.transaction(async (tx) => {
      await tx
        .update(BillingTable)
        .set({
          balance: sql`${BillingTable.balance} + ${amountInMicroCents}`,
        })
        .where(eq(BillingTable.workspaceID, workspaceID))
      await tx.insert(PaymentTable).values({
        workspaceID,
        id: Identifier.create("payment"),
        amount: amountInMicroCents,
        enrichment: {
          type: "credit",
        },
      })
    })
    return amountInMicroCents
  }

  export const subtractLiteUsage = async (workspaceID: string, amountInMicroCents: number) => {
    await Database.transaction(async (tx) => {
      const lite = await tx
        .select({ id: LiteTable.id })
        .from(LiteTable)
        .where(and(eq(LiteTable.workspaceID, workspaceID), isNull(LiteTable.timeDeleted)))
        .then((rows) => rows[0])
      if (!lite) throw new Error("Subscribe to Go before applying referral rewards")

      await tx
        .update(LiteTable)
        .set({
          monthlyUsage: sql`GREATEST(0, COALESCE(${LiteTable.monthlyUsage}, 0) - ${amountInMicroCents})`,
          weeklyUsage: sql`GREATEST(0, COALESCE(${LiteTable.weeklyUsage}, 0) - ${amountInMicroCents})`,
          rollingUsage: sql`GREATEST(0, COALESCE(${LiteTable.rollingUsage}, 0) - ${amountInMicroCents})`,
        })
        .where(and(eq(LiteTable.workspaceID, workspaceID), isNull(LiteTable.timeDeleted)))
    })
  }

  export const redeemCoupon = async (email: string, type: (typeof CouponType)[number]) => {
    // validate coupon type
    await (async () => {
      if (type === "GO1MONTH50") return
      const coupon = await Database.use((tx) =>
        tx
          .select()
          .from(CouponTable)
          .where(and(eq(CouponTable.email, email), eq(CouponTable.type, type)))
          .then((rows) => rows[0]),
      )
      if (!coupon) throw new Error("Invalid coupon code")
      if (coupon.timeRedeemed) throw new Error("Coupon already redeemed")
    })()

    if (type === "BUILDATHON") await grantCredit(Actor.workspace(), 500)

    await Database.use((tx) =>
      tx
        .insert(CouponTable)
        .values({ email, type, timeRedeemed: sql`now()` })
        .onDuplicateKeyUpdate({
          set: {
            timeRedeemed: sql`now()`,
          },
        }),
    )
  }

  export const setMonthlyLimit = fn(z.number(), async (input) => {
    return await Database.use((tx) =>
      tx
        .update(BillingTable)
        .set({
          monthlyLimit: input,
        })
        .where(eq(BillingTable.workspaceID, Actor.workspace())),
    )
  })

  export const generateCheckoutUrl = fn(
    z.object({
      successUrl: z.string(),
      cancelUrl: z.string(),
      amount: z.number().optional(),
    }),
    async (input) => {
      const { successUrl, amount } = input

      if (amount !== undefined && amount < Billing.RELOAD_AMOUNT_MIN) {
        throw new Error(`Amount must be at least $${Billing.RELOAD_AMOUNT_MIN}`)
      }

      const customer = await Billing.get()
      const amountInCents = (amount ?? customer.reloadAmount ?? Billing.RELOAD_AMOUNT) * 100

      const totalAmount = amountInCents + calculateFeeInCents(amountInCents)
      const paymentLink = await Billing.razorpay().paymentLink.create({
        amount: totalAmount,
        currency: "INR",
        description: `Add ${(amountInCents / 100).toFixed(2)} credits`,
        notes: {
          workspaceID: Actor.workspace(),
          amount: amountInCents.toString(),
        },
        callback_url: successUrl,
        callback_method: "get",
      })

      return paymentLink.short_url
    },
  )

  export const generateLiteCheckoutUrl = fn(
    z.object({
      successUrl: z.string(),
      cancelUrl: z.string(),
      method: z.enum(["alipay", "upi"]).optional(),
    }),
    async (input) => {
      const user = Actor.assert("user")
      const { successUrl, cancelUrl, method } = input

      const email = (await User.getAuthEmail(user.properties.userID))!
      const billing = await Billing.get()

      if (billing.subscriptionID) throw new Error("Already subscribed to Black")
      if (billing.liteSubscriptionID) throw new Error("Already subscribed to Lite")

      const coupons = await Database.use((tx) =>
        tx
          .select({ type: CouponTable.type, timeRedeemed: CouponTable.timeRedeemed })
          .from(CouponTable)
          .where(eq(CouponTable.email, email)),
      )

      const amount = LiteData.priceInr()
      const order = await Billing.razorpay().orders.create({
        amount,
        currency: "INR",
        receipt: `lite_${Actor.workspace().slice(0, 8)}`,
        notes: {
          workspaceID: Actor.workspace(),
          userID: user.properties.userID,
          userEmail: email,
          type: "lite",
        },
      })

      const subscription = await Billing.razorpay().subscriptions.create({
        plan_id: LiteData.priceID(),
        total_count: 12,
        notify_info: { notify: false },
        notes: {
          workspaceID: Actor.workspace(),
          userID: user.properties.userID,
          userEmail: email,
          type: "lite",
        },
      })

      return subscription.short_url
    },
  )

  export const generateSessionUrl = fn(
    z.object({
      returnUrl: z.string(),
    }),
    async (input) => {
      const { returnUrl } = input
      return returnUrl
    },
  )

  export const generateReceiptUrl = fn(
    z.object({
      paymentID: z.string(),
    }),
    async (input) => {
      const { paymentID } = input
      try {
        const payment = await Billing.razorpay().payments.fetch(paymentID)
        return payment.acquirer_data?.rrn
          ? `https://razorpay.com/payments/${paymentID}`
          : null
      } catch {
        return null
      }
    },
  )

  export const subscribeBlack = fn(
    z.object({
      seats: z.number(),
      coupon: z.string().optional(),
    }),
    async ({ seats, coupon }) => {
      const user = Actor.assert("user")
      const billing = await Database.use((tx) =>
        tx
          .select({
            customerID: BillingTable.customerID,
            paymentMethodID: BillingTable.paymentMethodID,
            subscriptionID: BillingTable.subscriptionID,
            subscriptionPlan: BillingTable.subscriptionPlan,
            timeSubscriptionSelected: BillingTable.timeSubscriptionSelected,
          })
          .from(BillingTable)
          .where(eq(BillingTable.workspaceID, Actor.workspace()))
          .then((rows) => rows[0]),
      )

      if (!billing) throw new Error("Billing record not found")
      if (!billing.timeSubscriptionSelected) throw new Error("Not selected for subscription")
      if (billing.subscriptionID) throw new Error("Already subscribed")
      if (!billing.customerID) throw new Error("No customer ID")
      if (!billing.paymentMethodID) throw new Error("No payment method")
      if (!billing.subscriptionPlan) throw new Error("No subscription plan")

      const subscription = await Billing.razorpay().subscriptions.create({
        plan_id: BlackData.planToPriceID({ plan: billing.subscriptionPlan }),
        total_count: 12,
        quantity: seats,
        customer_notify: false,
        notes: {
          workspaceID: Actor.workspace(),
        },
      })

      await Database.transaction(async (tx) => {
        await tx
          .update(BillingTable)
          .set({
            subscriptionID: subscription.id,
            subscription: {
              status: "subscribed",
              coupon,
              seats,
              plan: billing.subscriptionPlan!,
            },
            subscriptionPlan: null,
            timeSubscriptionBooked: null,
            timeSubscriptionSelected: null,
          })
          .where(eq(BillingTable.workspaceID, Actor.workspace()))

        await tx.insert(SubscriptionTable).values({
          workspaceID: Actor.workspace(),
          id: Identifier.create("subscription"),
          userID: user.properties.userID,
        })
      })

      return subscription.id
    },
  )

  export const unsubscribeBlack = fn(
    z.object({
      subscriptionID: z.string(),
    }),
    async ({ subscriptionID }) => {
      const workspaceID = await Database.use((tx) =>
        tx
          .select({ workspaceID: BillingTable.workspaceID })
          .from(BillingTable)
          .where(eq(BillingTable.subscriptionID, subscriptionID))
          .then((rows) => rows[0]?.workspaceID),
      )
      if (!workspaceID) throw new Error("Workspace ID not found for subscription")

      await Database.transaction(async (tx) => {
        await tx
          .update(BillingTable)
          .set({ subscriptionID: null, subscription: null })
          .where(eq(BillingTable.workspaceID, workspaceID))

        await tx.delete(SubscriptionTable).where(eq(SubscriptionTable.workspaceID, workspaceID))
      })
    },
  )

  export const unsubscribeLite = fn(
    z.object({
      subscriptionID: z.string(),
    }),
    async ({ subscriptionID }) => {
      const workspaceID = await Database.use((tx) =>
        tx
          .select({ workspaceID: BillingTable.workspaceID })
          .from(BillingTable)
          .where(eq(BillingTable.liteSubscriptionID, subscriptionID))
          .then((rows) => rows[0]?.workspaceID),
      )
      if (!workspaceID) throw new Error("Workspace ID not found for subscription")

      await Database.transaction(async (tx) => {
        await tx
          .update(BillingTable)
          .set({ liteSubscriptionID: null, lite: null })
          .where(eq(BillingTable.workspaceID, workspaceID))

        await tx.delete(LiteTable).where(eq(LiteTable.workspaceID, workspaceID))
      })
    },
  )
}
