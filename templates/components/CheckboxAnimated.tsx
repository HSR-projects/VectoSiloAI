// @ts-nocheck
// Template ID: form-checkbox
"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CheckboxAnimatedProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const checkVariants = {
  unchecked: { pathLength: 0, opacity: 0 },
  checked: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

const boxVariants = {
  unchecked: { backgroundColor: "transparent", borderColor: "#8e8e93" },
  checked: {
    backgroundColor: "#10a37f",
    borderColor: "#10a37f",
    transition: { duration: 0.2 },
  },
};

export const CheckboxAnimated = forwardRef<
  HTMLInputElement,
  CheckboxAnimatedProps
>(({ label, checked, onChange, disabled, className, id: externalId, ...props }, ref) => {
  const genId = useId();
  const id = externalId ?? genId;

  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex cursor-pointer items-center gap-3",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
          {...props}
        />
        <motion.div
          className="absolute inset-0 rounded border-2"
          variants={boxVariants}
          initial={false}
          animate={checked ? "checked" : "unchecked"}
          style={{ borderColor: checked ? "#10a37f" : "#8e8e93" }}
        />
        <motion.svg
          viewBox="0 0 16 16"
          className="relative z-10 h-3.5 w-3.5"
          fill="none"
          stroke="white"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M3 8L6.5 11.5L13 4.5"
            variants={checkVariants}
            initial={false}
            animate={checked ? "checked" : "unchecked"}
          />
        </motion.svg>
      </div>
      {label && (
        <span className="select-none text-sm text-incogni-text">{label}</span>
      )}
    </label>
  );
});

CheckboxAnimated.displayName = "CheckboxAnimated";
