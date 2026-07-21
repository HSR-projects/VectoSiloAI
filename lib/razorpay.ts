import Razorpay from "razorpay";

if (!process.env.RAZORPAY_KEY_ID) {
  throw new Error("RAZORPAY_KEY_ID is not set");
}
if (!process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("RAZORPAY_KEY_SECRET is not set");
}

export const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/** Prices in USD cents per month for each paid plan. */
export const PLAN_PRICES: Record<string, number> = {
  go: 1000,      // $10
  pro: 20000,    // $200
  max: 60000,    // $600
  ultra: 100000, // $1,000
};

export const PLAN_NAMES: Record<string, string> = {
  go: "VectoSilo AI Go",
  pro: "VectoSilo AI Pro",
  max: "VectoSilo AI Max",
  ultra: "VectoSilo AI Ultra",
};

export const PLAN_DESCRIPTIONS: Record<string, string> = {
  go: "Agents, model choice, and VectoSilo's Computer at an entry price.",
  pro: "Autonomous research agents, multi-step tasks, and priority features.",
  max: "Maximum depth — the deepest research runs and early access.",
  ultra: "Enterprise org — manage teams, share chats, gift seats, and more.",
};
