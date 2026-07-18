// @ts-nocheck
// Template ID: form-textarea
"use client";

import {
  forwardRef,
  useId,
  useState,
  type TextareaHTMLAttributes,
} from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TextareaAnimatedProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxLength?: number;
}

export const TextareaAnimated = forwardRef<
  HTMLTextAreaElement,
  TextareaAnimatedProps
>(
  (
    {
      label,
      error,
      maxLength,
      className,
      id: externalId,
      onFocus,
      onBlur,
      onChange,
      ...props
    },
    ref
  ) => {
    const genId = useId();
    const id = externalId ?? genId;
    const [focused, setFocused] = useState(false);
    const [charCount, setCharCount] = useState(
      typeof props.value === "string" ? props.value.length : 0
    );
    const filled = typeof props.value === "string" && props.value.length > 0;
    const float = focused || filled;

    return (
      <div className={cn("relative", className)}>
        <div
          className={cn(
            "relative rounded-lg border bg-koda-surface transition-all duration-200",
            error
              ? "border-red-500"
              : focused
                ? "border-koda-accent shadow-glow"
                : "border-koda-border hover:border-koda-muted"
          )}
        >
          <textarea
            ref={ref}
            id={id}
            rows={4}
            className={cn(
              "peer w-full resize-none border-none bg-transparent px-3 pt-6 pb-2 text-koda-text outline-none placeholder-transparent transition-colors"
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
            onChange={(e) => {
              setCharCount(e.target.value.length);
              onChange?.(e);
            }}
            maxLength={maxLength}
            {...props}
          />
          {label && (
            <label
              htmlFor={id}
              className={cn(
                "pointer-events-none absolute left-3 top-0 origin-left transition-all duration-200",
                float
                  ? "translate-y-1.5 text-xs"
                  : "translate-y-3.5 text-sm",
                error
                  ? "text-red-400"
                  : focused
                    ? "text-koda-accent"
                    : "text-koda-muted"
              )}
            >
              {label}
            </label>
          )}
        </div>

        <div className="mt-1 flex items-center justify-between">
          {error ? (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1 text-xs text-red-400"
            >
              <AlertCircle size={12} />
              {error}
            </motion.p>
          ) : (
            <span />
          )}
          {maxLength && (
            <span
              className={cn(
                "text-xs transition-colors",
                charCount >= maxLength
                  ? "text-red-400"
                  : "text-koda-muted"
              )}
            >
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      </div>
    );
  }
);

TextareaAnimated.displayName = "TextareaAnimated";
