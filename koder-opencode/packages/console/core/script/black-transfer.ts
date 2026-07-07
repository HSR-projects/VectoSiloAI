import { Billing } from "../src/billing.js"
import { and, Database, desc, eq, isNotNull, lt, sql } from "../src/drizzle/index.js"
import { BillingTable, PaymentTable, SubscriptionTable } from "../src/schema/billing.sql.js"

const fromWrkID = process.argv[2]
const toWrkID = process.argv[3]

if (!fromWrkID || !toWrkID) {
  console.error("Usage: bun foo.ts <fromWrkID> <toWrkID>")
  process.exit(1)
}

console.log(`Transferring subscription from ${fromWrkID} to ${toWrkID}`)

const fromBilling = await Database.use((tx) =>
  tx
    .select({
      customerID: BillingTable.customerID,
      subscriptionID: BillingTable.subscriptionID,
      subscription: BillingTable.subscription,
      paymentMethodID: BillingTable.paymentMethodID,
      paymentMethodType: BillingTable.paymentMethodType,
      paymentMethodLast4: BillingTable.paymentMethodLast4,
    })
    .from(BillingTable)
    .where(eq(BillingTable.workspaceID, fromWrkID))
    .then((rows) => rows[0]),
)
if (!fromBilling) throw new Error(`Error: FROM workspace has no billing record`)
if (!fromBilling.subscriptionID) throw new Error(`Error: FROM workspace has no subscription`)

const fromSubscription = await Database.use((tx) =>
  tx
    .select({ userID: SubscriptionTable.userID })
    .from(SubscriptionTable)
    .where(eq(SubscriptionTable.workspaceID, fromWrkID))
    .then((rows) => rows[0]),
)
if (!fromSubscription) throw new Error(`Error: FROM workspace has no subscription`)

const toBilling = await Database.use((tx) =>
  tx
    .select({
      customerID: BillingTable.customerID,
      subscriptionID: BillingTable.subscriptionID,
    })
    .from(BillingTable)
    .where(eq(BillingTable.workspaceID, toWrkID))
    .then((rows) => rows[0]),
)
if (!toBilling) throw new Error(`Error: TO workspace has no billing record`)
if (toBilling.subscriptionID) throw new Error(`Error: TO workspace already has a subscription`)

await Database.transaction(async (tx) => {
  await tx
    .update(BillingTable)
    .set({
      subscriptionID: null,
      subscription: null,
    })
    .where(eq(BillingTable.workspaceID, fromWrkID))

  await tx
    .update(BillingTable)
    .set({
      subscriptionID: fromBilling.subscriptionID,
      subscription: fromBilling.subscription,
    })
    .where(eq(BillingTable.workspaceID, toWrkID))

  await tx
    .update(SubscriptionTable)
    .set({
      workspaceID: toWrkID,
      userID: fromSubscription.userID,
    })
    .where(eq(SubscriptionTable.workspaceID, fromWrkID))
})

console.log(`done`)
