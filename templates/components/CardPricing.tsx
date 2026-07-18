// @ts-nocheck
// Template ID: card-pricing
"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CardPricingProps {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: { label: string; href: string };
  popular?: boolean;
  className?: string;
}

export function CardPricing({
  name,
  price,
  period,
  features,
  cta,
  popular,
  className,
}: CardPricingProps) {
  return (
    <motion.div
      className={cn(
        "relative rounded-xl border bg-[#2f2f2f] p-6 flex flex-col",
        popular
          ? "border-[#10a37f] shadow-[0_0_20px_rgba(16,163,127,0.15)]"
          : "border-[#424242]",
        className
      )}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#10a37f] text-[#ececec] text-xs font-semibold px-3 py-1 rounded-full">
          Most Popular
        </span>
      )}
      <h3 className="text-xl font-bold text-[#ececec]">{name}</h3>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-[#ececec]">{price}</span>
        <span className="text-sm text-[#8e8e93]">/{period}</span>
      </div>
      <ul className="mt-6 space-y-3 flex-1">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#8e8e93]">
            <Check size={16} className="mt-0.5 text-[#10a37f] shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className={cn(
          "mt-8 block w-full text-center rounded-lg py-2.5 text-sm font-semibold transition-colors",
          popular
            ? "bg-[#10a37f] text-white hover:bg-[#0d8c6b]"
            : "border border-[#424242] text-[#ececec] hover:bg-[#343541]"
        )}
      >
        {cta.label}
      </Link>
    </motion.div>
  );
}
