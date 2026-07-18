// @ts-nocheck
// Template ID: page-pricing-tiered
"use client";

import { motion } from "framer-motion";
import { Check, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PageTransition } from "../components/PageTransition";

type Tier = {
  name: string;
  price: string;
  period: string;
  description: string;
  popular?: boolean;
  features: string[];
  cta: { label: string; href: string };
};

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started.",
    features: [
      "1 project",
      "1 GB storage",
      "1k API calls/month",
      "Basic analytics",
      "Community support",
    ],
    cta: { label: "Get Started", href: "#" },
  },
  {
    name: "Basic",
    price: "$19",
    period: "month",
    description: "For individuals and small teams.",
    features: [
      "10 projects",
      "25 GB storage",
      "100k API calls/month",
      "Advanced analytics",
      "Email support",
      "API access",
    ],
    cta: { label: "Start Free Trial", href: "#" },
  },
  {
    name: "Pro",
    price: "$49",
    period: "month",
    popular: true,
    description: "For growing businesses.",
    features: [
      "Unlimited projects",
      "100 GB storage",
      "1M API calls/month",
      "Advanced analytics & reports",
      "Priority support",
      "API & webhooks",
      "Team members (up to 20)",
      "Custom integrations",
    ],
    cta: { label: "Start Free Trial", href: "#" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "contact us",
    description: "For large organizations.",
    features: [
      "Unlimited everything",
      "1 TB+ storage",
      "Unlimited API calls",
      "Custom analytics",
      "24/7 dedicated support",
      "SSO & audit logs",
      "SLA guarantee",
      "Custom onboarding",
      "Dedicated account manager",
    ],
    cta: { label: "Contact Sales", href: "#" },
  },
];

const allFeatureNames = [
  "Projects",
  "Storage",
  "API calls",
  "Analytics",
  "Support",
  "API access",
  "Webhooks",
  "Team members",
  "Custom integrations",
  "SSO & audit logs",
  "SLA guarantee",
  "Dedicated manager",
];

const featureCheck: Record<string, (Tier & { name: string })[]> = {
  "Projects": [tiers[0], tiers[1], tiers[2], tiers[3]],
  "Storage": [tiers[0], tiers[1], tiers[2], tiers[3]],
  "API calls": [tiers[0], tiers[1], tiers[2], tiers[3]],
  "Analytics": [tiers[0], tiers[1], tiers[2], tiers[3]],
  "Support": [tiers[0], tiers[1], tiers[2], tiers[3]],
  "API access": [tiers[1], tiers[2], tiers[3]],
  "Webhooks": [tiers[1], tiers[2], tiers[3]],
  "Team members": [tiers[2], tiers[3]],
  "Custom integrations": [tiers[1], tiers[2], tiers[3]],
  "SSO & audit logs": [tiers[2], tiers[3]],
  "SLA guarantee": [tiers[2], tiers[3]],
  "Dedicated manager": [tiers[3]],
};

const featureValues: Record<string, string[]> = {
  "Projects": ["1", "10", "Unlimited", "Unlimited"],
  "Storage": ["1 GB", "25 GB", "100 GB", "1 TB+"],
  "API calls": ["1k/mo", "100k/mo", "1M/mo", "Unlimited"],
  "Analytics": ["Basic", "Advanced", "Advanced & Reports", "Custom"],
  "Support": ["Community", "Email", "Priority", "24/7 Dedicated"],
  "API access": ["—", "REST", "REST + GraphQL", "Full"],
  "Webhooks": ["—", "—", "Yes", "Yes"],
  "Team members": ["1", "5", "20", "Unlimited"],
  "Custom integrations": ["—", "Basic", "Advanced", "Full"],
  "SSO & audit logs": ["—", "—", "Yes", "Yes"],
  "SLA guarantee": ["—", "—", "99.9%", "99.99%"],
  "Dedicated manager": ["—", "—", "—", "Yes"],
};

export default function PricingTiered() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight text-[#ececec] sm:text-5xl">
              Find the Perfect Plan
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[#8e8e93]">
              From solo developers to enterprise teams, we have a plan that
              scales with you.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-16 grid gap-6 md:grid-cols-4"
          >
            {tiers.map((tier) => (
              <motion.div
                key={tier.name}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "relative flex flex-col rounded-xl border p-6",
                  tier.popular
                    ? "border-[#10a37f] shadow-[0_0_20px_rgba(16,163,127,0.15)]"
                    : "border-[#424242] bg-[#2f2f2f]"
                )}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#10a37f] px-3 py-1 text-xs font-semibold text-[#ececec]">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-[#ececec]">{tier.name}</h3>
                <p className="mt-1 text-sm text-[#8e8e93]">{tier.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-[#ececec]">
                    {tier.price}
                  </span>
                  <span className="text-sm text-[#8e8e93]">/{tier.period}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-sm text-[#8e8e93]"
                    >
                      <Check size={16} className="mt-0.5 shrink-0 text-[#10a37f]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.cta.href}
                  className={cn(
                    "mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors",
                    tier.popular
                      ? "bg-[#10a37f] text-white hover:bg-[#0d8c6b]"
                      : "border border-[#424242] text-[#ececec] hover:bg-[#343541]"
                  )}
                >
                  {tier.cta.label}
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-24"
          >
            <h2 className="mb-8 text-center text-2xl font-bold text-[#ececec]">
              Full Feature Comparison
            </h2>
            <div className="overflow-x-auto rounded-xl border border-[#424242]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#424242] bg-[#2f2f2f]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#8e8e93]">
                      Feature
                    </th>
                    {tiers.map((tier) => (
                      <th
                        key={tier.name}
                        className={cn(
                          "px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider",
                          tier.popular ? "text-[#10a37f]" : "text-[#8e8e93]"
                        )}
                      >
                        {tier.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allFeatureNames.map((feature, i) => (
                    <tr
                      key={feature}
                      className={cn(
                        "border-b border-[#424242] transition-colors last:border-b-0 hover:bg-[#2f2f2f]/60",
                        i % 2 === 0 ? "bg-transparent" : "bg-[#2f2f2f]/30"
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-[#ececec]">
                        {feature}
                      </td>
                      {featureValues[feature].map((val, j) => (
                        <td
                          key={j}
                          className="px-4 py-3 text-center text-[#ececec]"
                        >
                          {val === "—" ? (
                            <X
                              size={16}
                              className="mx-auto text-[#8e8e93]/50"
                            />
                          ) : val === "Yes" ? (
                            <Check
                              size={16}
                              className="mx-auto text-[#10a37f]"
                            />
                          ) : (
                            <span className="text-[#8e8e93]">{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        <section className="border-t border-[#424242] bg-[#2f2f2f] px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-[#ececec]">
                Not Sure Which Plan Is Right?
              </h2>
              <p className="mt-4 text-lg text-[#8e8e93]">
                Our team will help you find the perfect plan for your needs.
              </p>
              <motion.a
                href="#"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#10a37f] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d8c6b]"
              >
                Talk to Sales
                <ArrowRight size={16} />
              </motion.a>
            </motion.div>
          </div>
        </section>

        <footer className="border-t border-[#424242] py-12">
          <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[#8e8e93]">
            &copy; {new Date().getFullYear()} KodaAI. All rights reserved.
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
