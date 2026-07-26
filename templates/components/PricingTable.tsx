// @ts-nocheck
// Template ID: marketing-pricing
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ToggleSwitch } from "./ToggleSwitch";

export interface PricingPlan {
  name: string;
  price: { monthly: string; yearly: string };
  period?: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  popular?: boolean;
  highlighted?: boolean;
}

export interface PricingTableProps {
  plans: PricingPlan[];
  yearly?: boolean;
  className?: string;
}

export function PricingTable({
  plans,
  yearly: initialYearly = false,
  className,
}: PricingTableProps) {
  const [isYearly, setIsYearly] = useState(initialYearly);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  return (
    <section className={cn("py-16 px-4", className)}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-incogni-text sm:text-4xl">
            Pricing
          </h2>
          <p className="mt-4 text-lg text-incogni-muted">
            Choose the plan that fits your needs
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span
              className={cn(
                "text-sm transition-colors",
                !isYearly ? "text-incogni-text" : "text-incogni-muted",
              )}
            >
              Monthly
            </span>
            <ToggleSwitch
              checked={isYearly}
              onChange={setIsYearly}
              size="md"
            />
            <span
              className={cn(
                "text-sm transition-colors",
                isYearly ? "text-incogni-text" : "text-incogni-muted",
              )}
            >
              Yearly
              <span className="ml-1.5 rounded-full bg-incogni-accent/20 px-2 py-0.5 text-xs text-incogni-accent">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-12 grid gap-6 lg:grid-cols-3"
        >
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              whileHover={{
                y: plan.popular ? -8 : -4,
                transition: { duration: 0.2 },
              }}
              className={cn(
                "relative flex flex-col rounded-xl border p-6 transition-shadow",
                plan.popular
                  ? "border-incogni-accent bg-incogni-surface shadow-[0_0_30px_rgba(16,163,127,0.12)] scale-105 lg:scale-110"
                  : plan.highlighted
                    ? "border-incogni-accent/40 bg-incogni-surface"
                    : "border-incogni-border bg-incogni-surface",
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-incogni-accent px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h3 className="text-xl font-bold text-incogni-text">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-incogni-muted">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <motion.span
                  key={isYearly ? "yearly" : "monthly"}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-4xl font-bold text-incogni-text"
                >
                  {isYearly ? plan.price.yearly : plan.price.monthly}
                </motion.span>
                <span className="text-sm text-incogni-muted">
                  /{plan.period ?? (isYearly ? "year" : "month")}
                </span>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {plan.features.map((feature, j) => (
                  <li
                    key={j}
                    className="flex items-start gap-2 text-sm text-incogni-muted"
                  >
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-incogni-accent"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.cta.href}
                className={cn(
                  "mt-8 block w-full text-center rounded-lg py-2.5 text-sm font-semibold transition-colors",
                  plan.popular
                    ? "bg-incogni-accent text-white hover:bg-incogni-accent/90"
                    : "border border-incogni-border text-incogni-text hover:bg-incogni-surface-2",
                )}
              >
                {plan.cta.label}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
