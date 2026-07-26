// @ts-nocheck
// Template ID: hero-basic
"use client";

import { type HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroCta {
  label: string;
  href: string;
}

interface HeroBasicProps extends import("@/templates/utils/types").MotionDivProps {
  title: string;
  subtitle?: string;
  primaryCta?: HeroCta;
  secondaryCta?: HeroCta;
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const fadeSlide = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export function HeroBasic({
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  className,
  ...rest
}: HeroBasicProps) {
  return (
    <section className={cn("flex min-h-[70vh] items-center justify-center px-4", className)} {...rest}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="max-w-3xl text-center"
      >
        <motion.h1
          variants={fadeSlide}
          className="text-4xl font-bold tracking-tight text-incogni-text sm:text-5xl lg:text-6xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            variants={fadeSlide}
            className="mt-4 text-lg text-incogni-muted sm:text-xl"
          >
            {subtitle}
          </motion.p>
        )}
        {(primaryCta || secondaryCta) && (
          <motion.div
            variants={fadeSlide}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            {primaryCta && (
              <a
                href={primaryCta.href}
                className="rounded-lg bg-incogni-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-incogni-accent-dim"
              >
                {primaryCta.label}
              </a>
            )}
            {secondaryCta && (
              <a
                href={secondaryCta.href}
                className="rounded-lg border border-incogni-border px-6 py-3 text-sm font-semibold text-incogni-text transition-colors hover:bg-incogni-surface"
              >
                {secondaryCta.label}
              </a>
            )}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
