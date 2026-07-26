// @ts-nocheck
// Template ID: page-compare-plans
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ArrowRight } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import { cn } from "@/lib/utils";

interface PlanFeature {
  name: string;
  tooltip?: string;
  values: (string | boolean | number)[];
}

interface Plan {
  name: string;
  description?: string;
  price: string;
  period?: string;
  popular?: boolean;
  cta?: string;
  href?: string;
  color?: string;
}

interface ComparePlansProps {
  title: string;
  subtitle?: string;
  plans: Plan[];
  features: PlanFeature[];
  className?: string;
}

export function ComparePlans({
  title,
  subtitle,
  plans,
  features,
  className,
}: ComparePlansProps) {
  const [showAll, setShowAll] = useState(false);
  const initialFeatures = 5;
  const displayed = showAll ? features : features.slice(0, initialFeatures);

  return (
    <PageTransition>
      <div className={cn("min-h-screen bg-incogni-bg py-16 sm:py-24", className)}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold text-incogni-text sm:text-5xl">{title}</h1>
            {subtitle && (
              <p className="mt-3 text-lg text-incogni-muted max-w-2xl mx-auto">{subtitle}</p>
            )}
          </motion.div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="w-48 pb-4 text-left" />
                  {plans.map((plan, i) => (
                    <th
                      key={i}
                      className={cn(
                        "relative pb-4 text-center",
                        plan.popular && "px-2"
                      )}
                    >
                      {plan.popular && (
                        <motion.span
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-2 inline-block rounded-full bg-incogni-accent/20 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-incogni-accent"
                        >
                          Most Popular
                        </motion.span>
                      )}
                      <div
                        className={cn(
                          "rounded-xl border border-incogni-border bg-incogni-surface p-5 transition-all duration-300",
                          plan.popular && "border-incogni-accent/40 shadow-lg shadow-incogni-accent/5"
                        )}
                      >
                        <h3 className="text-lg font-bold text-incogni-text">{plan.name}</h3>
                        {plan.description && (
                          <p className="mt-1 text-xs text-incogni-muted">{plan.description}</p>
                        )}
                        <div className="mt-4">
                          <span className="text-3xl font-bold text-incogni-text">
                            {plan.price}
                          </span>
                          {plan.period && (
                            <span className="text-sm text-incogni-muted">/{plan.period}</span>
                          )}
                        </div>
                        <a
                          href={plan.href || "#"}
                          className={cn(
                            "mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                            plan.popular
                              ? "bg-incogni-accent text-white hover:bg-incogni-accent/90"
                              : "border border-incogni-border text-incogni-text hover:bg-incogni-surface-2"
                          )}
                        >
                          {plan.cta || "Get Started"} <ArrowRight size={14} />
                        </a>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((feature, fi) => (
                  <motion.tr
                    key={fi}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="border-b border-incogni-border/50 transition-colors hover:bg-incogni-surface/30"
                  >
                    <td className="py-3 pr-4 text-sm font-medium text-incogni-text">
                      {feature.name}
                      {feature.tooltip && (
                        <span className="ml-1.5 cursor-help text-incogni-muted" title={feature.tooltip}>
                          ⓘ
                        </span>
                      )}
                    </td>
                    {feature.values.map((val, vi) => (
                      <td key={vi} className="py-3 text-center">
                        {typeof val === "boolean" ? (
                          val ? (
                            <Check
                              size={16}
                              className="mx-auto text-incogni-accent"
                            />
                          ) : (
                            <X
                              size={16}
                              className="mx-auto text-incogni-muted/40"
                            />
                          )
                        ) : (
                          <span className="text-sm text-incogni-muted">{String(val)}</span>
                        )}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {features.length > initialFeatures && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-center"
            >
              <button
                onClick={() => setShowAll(!showAll)}
                className="rounded-lg px-6 py-2 text-sm font-medium text-incogni-accent transition-colors hover:bg-incogni-accent/10"
              >
                {showAll ? "Show fewer features" : `Show all ${features.length} features`}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
