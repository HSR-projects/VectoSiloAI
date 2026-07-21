// @ts-nocheck
// Template ID: form-select
"use client";

import {
  forwardRef,
  useId,
  useState,
  useRef,
  useEffect,
  useCallback,
  type HTMLAttributes,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectAnimatedProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export const SelectAnimated = forwardRef<HTMLDivElement, SelectAnimatedProps>(
  (
    {
      label,
      options,
      value,
      onChange,
      placeholder = "Select an option",
      error,
      className,
      ...props
    },
    ref
  ) => {
    const genId = useId();
    const id = genId;
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = options.find((o) => o.value === value);
    const float = open || !!selected;

    const handleClickOutside = useCallback((e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }, []);

    useEffect(() => {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [handleClickOutside]);

    return (
      <div ref={containerRef} className={cn("relative", className)} {...props}>
        <div
          ref={ref}
          role="combobox"
          aria-expanded={open}
          aria-labelledby={id}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setOpen((p) => !p);
              e.preventDefault();
            }
            if (e.key === "Escape") setOpen(false);
          }}
          onClick={() => setOpen((p) => !p)}
          className={cn(
            "relative flex cursor-pointer items-center rounded-lg border bg-vectosilo-surface px-3 py-3 transition-all duration-200",
            error
              ? "border-red-500"
              : open
                ? "border-vectosilo-accent shadow-glow"
                : "border-vectosilo-border hover:border-vectosilo-muted"
          )}
        >
          <div className="flex-1">
            {label && (
              <span
                className={cn(
                  "block origin-left transition-all duration-200",
                  float
                    ? "text-xs leading-none"
                    : "text-sm leading-none",
                  error
                    ? "text-red-400"
                    : open
                      ? "text-vectosilo-accent"
                      : "text-vectosilo-muted"
                )}
              >
                {label}
              </span>
            )}
            <span
              className={cn(
                "block truncate transition-colors",
                float ? "pt-1 text-sm" : "",
                selected ? "text-vectosilo-text" : "text-vectosilo-muted"
              )}
            >
              {selected ? selected.label : placeholder}
            </span>
          </div>
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown
              size={18}
              className={cn(
                "transition-colors",
                open ? "text-vectosilo-accent" : "text-vectosilo-muted"
              )}
            />
          </motion.div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 4, scaleY: 1 }}
              exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 w-full origin-top overflow-hidden rounded-lg border border-vectosilo-border bg-vectosilo-surface-2 shadow-xl"
              style={{ transformOrigin: "top" }}
            >
              {options.map((opt, i) => (
                <motion.li
                  key={opt.value}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.15 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                      opt.value === value
                        ? "bg-vectosilo-accent/10 text-vectosilo-accent"
                        : "text-vectosilo-text hover:bg-vectosilo-surface"
                    )}
                  >
                    <span className="h-4 w-4 shrink-0">
                      {opt.value === value && <Check size={16} />}
                    </span>
                    {opt.label}
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

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
      </div>
    );
  }
);

SelectAnimated.displayName = "SelectAnimated";
