// @ts-nocheck
// Template ID: form-toggle
"use client";

import { forwardRef, useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ToggleSwitchProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { track: "h-5 w-9", knob: "h-3.5 w-3.5", translate: "translate-x-4", label: "text-sm" },
  md: { track: "h-6 w-11", knob: "h-5 w-5", translate: "translate-x-5", label: "text-sm" },
  lg: { track: "h-7 w-14", knob: "h-6 w-6", translate: "translate-x-7", label: "text-base" },
} as const;

const trackVariants = {
  off: { backgroundColor: "#424242" },
  on: { backgroundColor: "#10a37f" },
};

const knobVariants = {
  off: { x: 0 },
  on: { x: "100%" },
};

export const ToggleSwitch = forwardRef<HTMLDivElement, ToggleSwitchProps>(
  ({ label, checked, onChange, disabled, size = "md" }, ref) => {
    const genId = useId();
    const id = genId;
    const s = sizeMap[size];

    return (
      <label
        htmlFor={id}
        className={cn(
          "inline-flex cursor-pointer items-center gap-3",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <div
          ref={ref}
          className="relative"
        >
          <input
            id={id}
            type="checkbox"
            role="switch"
            aria-checked={checked}
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
          />
          <motion.div
            className={cn(
              "rounded-full transition-shadow",
              s.track,
              checked && "shadow-glow"
            )}
            variants={trackVariants}
            initial={false}
            animate={checked ? "on" : "off"}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className={cn(
                "m-0.5 rounded-full bg-white shadow",
                s.knob
              )}
              variants={knobVariants}
              initial={false}
              animate={checked ? "on" : "off"}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              style={{ x: 0 }}
            />
          </motion.div>
        </div>
        {label && (
          <span className={cn("select-none text-vectosilo-text", s.label)}>
            {label}
          </span>
        )}
      </label>
    );
  }
);

ToggleSwitch.displayName = "ToggleSwitch";
