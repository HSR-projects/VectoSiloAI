// @ts-nocheck
// Template ID: hero-split
"use client";

import { type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroCta {
  label: string;
  href: string;
}

interface HeroSplitProps extends import("@/templates/utils/types").MotionDivProps {
  title: string;
  subtitle?: string;
  cta?: HeroCta;
  image?: string | ReactNode;
  reverse?: boolean;
}

export function HeroSplit({
  title,
  subtitle,
  cta,
  image,
  reverse = false,
  className,
  ...rest
}: HeroSplitProps) {
  const { scrollYProgress } = useScroll({
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section
      className={cn(
        "mx-auto flex min-h-[80vh] max-w-7xl flex-col items-center gap-12 px-4 py-20 sm:px-6 lg:px-8",
        reverse ? "lg:flex-row-reverse" : "lg:flex-row",
        className
      )}
      {...rest}
    >
      <motion.div
        initial={{ opacity: 0, x: reverse ? 30 : -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="flex-1 text-center lg:text-left"
      >
        <h1 className="text-4xl font-bold tracking-tight text-incogni-text sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 text-lg text-incogni-muted sm:text-xl">{subtitle}</p>
        )}
        {cta && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8"
          >
            <a
              href={cta.href}
              className="inline-block rounded-lg bg-incogni-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-incogni-accent-dim"
            >
              {cta.label}
            </a>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: reverse ? -30 : 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        className="flex-1 overflow-hidden rounded-2xl"
      >
        <motion.div style={{ y: imageY }} className="h-full w-full">
          {typeof image === "string" ? (
            <img
              src={image}
              alt="Hero visual"
              className="h-full w-full rounded-2xl object-cover"
            />
          ) : (
            image
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
