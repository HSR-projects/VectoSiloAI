// @ts-nocheck
// Template ID: hero-gradient
"use client";

import { type HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroCta {
  label: string;
  href: string;
}

interface HeroGradientProps extends import("@/templates/utils/types").MotionDivProps {
  title: string;
  subtitle?: string;
  cta?: HeroCta;
}

const shapes = [
  { size: 300, x: "10%", y: "15%", delay: 0 },
  { size: 200, x: "75%", y: "10%", delay: 2 },
  { size: 250, x: "20%", y: "60%", delay: 4 },
  { size: 180, x: "80%", y: "70%", delay: 1 },
];

const floatAnimation = (delay: number) => ({
  y: [0, -20, 0, 15, 0],
  x: [0, 10, -10, 5, 0],
  transition: {
    duration: 12,
    repeat: Infinity,
    ease: "easeInOut",
    delay,
  },
});

export function HeroGradient({
  title,
  subtitle,
  cta,
  className,
  ...rest
}: HeroGradientProps) {
  return (
    <section
      className={cn(
        "relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4",
        className
      )}
      {...rest}
    >
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(-45deg, #0d8c6d, #10a37f, #1a7f64, #212121)",
          backgroundSize: "400% 400%",
          animation: "gradientShift 15s ease infinite",
        }}
      />

      {shapes.map((shape, i) => (
        <motion.div
          key={i}
          animate={floatAnimation(shape.delay)}
          className="absolute rounded-full"
          style={{
            width: shape.size,
            height: shape.size,
            left: shape.x,
            top: shape.y,
            background:
              i % 2 === 0
                ? "radial-gradient(circle, rgba(16,163,127,0.15) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(236,236,236,0.08) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
      ))}

      <div className="relative z-10 max-w-3xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-lg text-white/80 sm:text-xl"
          >
            {subtitle}
          </motion.p>
        )}
        {cta && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8"
          >
            <a
              href={cta.href}
              className="inline-block rounded-lg bg-white px-6 py-3 text-sm font-semibold text-incogni-accent transition-colors hover:bg-white/90"
            >
              {cta.label}
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
