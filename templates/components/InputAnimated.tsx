// @ts-nocheck
// Template ID: form-input
"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
} from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InputAnimatedProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helperText?: string;
}

const shakeVariants = {
  shake: {
    x: [0, -4, 4, -4, 4, -2, 2, 0],
    transition: { duration: 0.4 },
  },
};

export const InputAnimated = forwardRef<HTMLInputElement, InputAnimatedProps>(
  (
    { label, error, icon, helperText, className, id: externalId, onFocus, onBlur, ...props },
    ref
  ) => {
    const genId = useId();
    const id = externalId ?? genId;
    const [focused, setFocused] = useState(false);
    const filled = typeof props.value === "string" && props.value.length > 0;
    const float = focused || filled;

    return (
      <div className={cn("relative", className)}>
        <motion.div
          animate={error ? "shake" : undefined}
          variants={shakeVariants}
          className="relative"
        >
          <div
            className={cn(
              "relative flex items-center rounded-lg border bg-vectosilo-surface transition-all duration-200",
              error
                ? "border-red-500"
                : focused
                  ? "border-vectosilo-accent shadow-glow"
                  : "border-vectosilo-border hover:border-vectosilo-muted"
            )}
          >
            {icon && (
              <span
                className={cn(
                  "pointer-events-none ml-3 transition-colors duration-200",
                  focused ? "text-vectosilo-accent" : "text-vectosilo-muted"
                )}
              >
                {icon}
              </span>
            )}
            <div className="relative flex-1">
              <input
                ref={ref}
                id={id}
                className={cn(
                  "peer w-full border-none bg-transparent pt-5 pb-2 text-vectosilo-text outline-none placeholder-transparent transition-colors",
                  icon ? "px-2" : "px-3"
                )}
                placeholder={label ?? ""}
                onFocus={(e) => {
                  setFocused(true);
                  onFocus?.(e);
                }}
                onBlur={(e) => {
                  setFocused(false);
                  onBlur?.(e);
                }}
                {...props}
              />
              {label && (
                <label
                  htmlFor={id}
                  className={cn(
                    "pointer-events-none absolute left-0 top-0 origin-left transition-all duration-200",
                    icon ? "ml-2" : "ml-3",
                    float
                      ? "translate-y-1.5 text-xs"
                      : "translate-y-3 text-sm",
                    error
                      ? "text-red-400"
                      : focused
                        ? "text-vectosilo-accent"
                        : "text-vectosilo-muted"
                  )}
                >
                  {label}
                </label>
              )}
            </div>
          </div>
        </motion.div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 flex items-center gap-1 text-xs text-red-400"
          >
            <AlertCircle size={12} />
            {error}
          </motion.p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-vectosilo-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

InputAnimated.displayName = "InputAnimated";
