// @ts-nocheck
// Template ID: marketing-features
"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

type LucideIconName = keyof typeof LucideIcons;

export interface FeatureItem {
  icon: LucideIconName;
  title: string;
  description: string;
}

export interface FeaturesGridProps {
  title: string;
  subtitle?: string;
  features: FeatureItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function FeaturesGrid({
  title,
  subtitle,
  features,
  columns = 3,
  className,
}: FeaturesGridProps) {
  const IconComponent = (name: LucideIconName) => {
    const Icon = LucideIcons[name] as
      | React.ComponentType<{ className?: string; size?: number }>
      | undefined;
    return Icon ? <Icon size={24} /> : null;
  };

  const gridCols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <section className={cn("py-16 px-4", className)}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-incogni-text sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-lg text-incogni-muted">{subtitle}</p>
          )}
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className={cn("mt-12 grid gap-6", gridCols[columns])}
        >
          {features.map((feature, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group rounded-xl border border-incogni-border bg-incogni-surface p-6 transition-colors hover:border-incogni-accent/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-incogni-accent/10 text-incogni-accent">
                {IconComponent(feature.icon)}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-incogni-text">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-incogni-muted">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
