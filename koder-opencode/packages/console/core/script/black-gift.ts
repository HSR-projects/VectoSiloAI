import { Billing } from "../src/billing.js"
import { and, Database, eq, isNull } from "../src/drizzle/index.js"
import { UserTable } from "../src/schema/user.sql.js"
import { BillingTable, SubscriptionTable } from "../src/schema/billing.sql.js"
import { Identifier } from "../src/identifier.js"
import { AuthTable } from "../src/schema/auth.sql.js"
import { BlackData } from "../src/black.js"

const plan = "200"
const workspaceID = process.argv[2]
const seats = parseInt(process.argv[3])

console.log(`Gifting ${seats} seats of Black to workspace ${workspaceID}`)

if (!workspaceID || !seats) throw new Error("Usage: bun foo.ts <workspaceID> <seats>")

const users = await Database.use((tx) =>
  tx
    .select({
      id: UserTable.id,
      role: UserTable.role,
      email: AuthTable.subject,
    })
    .from(UserTable)
    .leftJoin(AuthTable, and(eq(AuthTable.accountID, UserTable.accountID), eq(AuthTable.provider, "email")))
    .where(and(eq(UserTable.workspaceID, workspaceID), isNull(UserTable.timeDeleted))),
)
if (users.length === 0) throw new Error(`Error: No users found in workspace ${workspaceID}`)
if (users.length !== seats)
  throw new Error(`Error: Workspace ${workspaceID} has ${users.length} users, expected ${seats}`)

console.log(`Gifting Black subscription via Razorpay to workspace ${workspaceID}`)

const subscription = await Billing.razorpay().subscriptions.create({
  plan_id: BlackData.planToPriceID({ plan }),
  total_count: 12,
  quantity: seats,
  customer_notify: false,
  notes: {
    workspaceID,
  },
})
console.log(`Subscription ID: ${subscription.id}`)

await Database.transaction(async (tx) => {
  await tx
    .update(BillingTable)
    .set({
      subscriptionID: subscription.id,
      subscription: { status: "subscribed", seats, plan },
    })
    .where(eq(BillingTable.workspaceID, workspaceID))

  for (const user of users) {
    await tx.insert(SubscriptionTable).values({
      workspaceID,
      id: Identifier.create("subscription"),
      userID: user.id,
    })
  }
})

console.log(`done`)
