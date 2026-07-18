// @ts-nocheck
// Template ID: page-pricing-simple
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { CardPricing } from "../components/CardPricing";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { FAQ } from "../components/FAQ";
import { PageTransition } from "../components/PageTransition";

const plans = [
  {
    name: "Starter",
    price: { monthly: "$9", yearly: "$90" },
    period: "month",
    features: [
      "Up to 3 projects",
      "5 GB storage",
      "50k API calls/month",
      "Basic analytics",
      "Email support",
      "Community access",
    ],
    cta: { label: "Get Started", href: "#" },
  },
  {
    name: "Pro",
    price: { monthly: "$29", yearly: "$290" },
    period: "month",
    popular: true,
    features: [
      "Unlimited projects",
      "50 GB storage",
      "500k API calls/month",
      "Advanced analytics",
      "Priority support",
      "Custom integrations",
      "Team members (up to 10)",
    ],
    cta: { label: "Start Free Trial", href: "#" },
  },
  {
    name: "Enterprise",
    price: { monthly: "$99", yearly: "$990" },
    period: "month",
    features: [
      "Unlimited everything",
      "1 TB storage",
      "Unlimited API calls",
      "Custom analytics",
      "24/7 dedicated support",
      "SSO & audit logs",
      "SLA guarantee",
      "Custom onboarding",
    ],
    cta: { label: "Contact Sales", href: "#" },
  },
];

const faqItems = [
  {
    question: "Can I switch plans at any time?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and you will be billed prorated amounts.",
    category: "Billing",
  },
  {
    question: "Is there a free trial available?",
    answer:
      "Absolutely! The Pro plan comes with a 14-day free trial. No credit card required, and you get full access to all features.",
    category: "General",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept all major credit cards including Visa, Mastercard, and American Express. We also support PayPal and wire transfers for annual enterprise plans.",
    category: "Billing",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Yes, we offer a 30-day money-back guarantee on all plans. If you are not satisfied, contact our support team for a full refund.",
    category: "Billing",
  },
  {
    question: "How does enterprise pricing work?",
    answer:
      "Enterprise pricing is customized based on your needs. Contact our sales team for a personalized quote with volume discounts and dedicated support.",
    category: "Enterprise",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes, we use AES-256 encryption at rest and TLS 1.3 in transit. Our infrastructure is SOC 2 compliant with regular third-party security audits.",
    category: "Security",
  },
];

export default function PricingSimple() {
  const [yearly, setYearly] = useState(false);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight text-[#ececec] sm:text-5xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[#8e8e93]">
              No hidden fees, no surprises. Choose the plan that fits your needs
              and upgrade as you grow.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <span className="text-sm text-[#8e8e93]">Monthly</span>
              <ToggleSwitch
                checked={yearly}
                onChange={setYearly}
                size="md"
              />
              <span className="text-sm text-[#8e8e93]">
                Yearly{" "}
                <span className="ml-1 rounded-full bg-[#10a37f]/20 px-2 py-0.5 text-xs font-medium text-[#10a37f]">
                  Save 20%
                </span>
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-16 grid gap-8 md:grid-cols-3"
          >
            {plans.map((plan) => (
              <CardPricing
                key={plan.name}
                name={plan.name}
                price={yearly ? plan.price.yearly : plan.price.monthly}
                period={yearly ? "year" : plan.period}
                features={plan.features}
                cta={plan.cta}
                popular={plan.popular}
              />
            ))}
          </motion.div>
        </div>

        <FAQ
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about our pricing and plans."
          items={faqItems}
        />

        <section className="border-t border-[#424242] px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-[#ececec]">
                Need a Custom Plan?
              </h2>
              <p className="mt-4 text-lg text-[#8e8e93]">
                We offer tailored solutions for enterprises with unique
                requirements. Let us build a plan that works for you.
              </p>
              <motion.a
                href="#"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#10a37f] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d8c6b]"
              >
                Contact Sales
                <ArrowRight size={16} />
              </motion.a>
            </motion.div>
          </div>
        </section>

        <footer className="border-t border-[#424242] bg-[#2f2f2f] py-12">
          <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[#8e8e93]">
            &copy; {new Date().getFullYear()} KodaAI. All rights reserved.
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
