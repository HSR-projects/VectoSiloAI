// @ts-nocheck
// Template ID: form-radio
"use client";

import { forwardRef, useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioAnimatedProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  direction?: "row" | "column";
}

const rippleVariants = {
  idle: { scale: 0, opacity: 0.3 },
  selected: {
    scale: 1,
    opacity: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const innerVariants = {
  idle: { scale: 0 },
  selected: {
    scale: 1,
    transition: { type: "spring", stiffness: 500, damping: 30 },
  },
};

export const RadioAnimated = forwardRef<HTMLDivElement, RadioAnimatedProps>(
  ({ name, options, value, onChange, direction = "column" }, ref) => {
    const genId = useId();

    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn(
          "flex gap-3",
          direction === "row" ? "flex-row" : "flex-col"
        )}
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          const inputId = `${genId}-${opt.value}`;

          return (
            <label
              key={opt.value}
              htmlFor={inputId}
              className={cn(
                "inline-flex cursor-pointer items-center gap-3 transition-opacity",
                "hover:opacity-80"
              )}
            >
              <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                <input
                  id={inputId}
                  type="radio"
                  name={name}
                  value={opt.value}
                  checked={selected}
                  onChange={() => onChange?.(opt.value)}
                  className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
                />
                <div
                  className={cn(
                    "absolute inset-0 rounded-full border-2 transition-colors",
                    selected
                      ? "border-incogni-accent"
                      : "border-incogni-muted"
                  )}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-incogni-accent/30"
                  variants={rippleVariants}
                  initial={false}
                  animate={selected ? "selected" : "idle"}
                />
                <motion.div
                  className="z-10 h-2.5 w-2.5 rounded-full bg-incogni-accent"
                  variants={innerVariants}
                  initial={false}
                  animate={selected ? "selected" : "idle"}
                />
              </div>
              <span className="select-none text-sm text-incogni-text">
                {opt.label}
              </span>
            </label>
          );
        })}
      </div>
    );
  }
);

RadioAnimated.displayName = "RadioAnimated";
