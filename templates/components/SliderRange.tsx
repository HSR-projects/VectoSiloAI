// @ts-nocheck
// Template ID: form-slider
"use client";

import {
  forwardRef,
  useId,
  useState,
  useCallback,
  type InputHTMLAttributes,
} from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SliderRangeProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  showValue?: boolean;
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const SliderRange = forwardRef<HTMLDivElement, SliderRangeProps>(
  (
    {
      label,
      showValue = true,
      value = 50,
      onChange,
      min = 0,
      max = 100,
      step = 1,
      className,
      ...props
    },
    ref
  ) => {
    const genId = useId();
    const id = genId;
    const [dragging, setDragging] = useState(false);
    const [hover, setHover] = useState(false);

    const pct = ((value - min) / (max - min)) * 100;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(Number(e.target.value));
      },
      [onChange]
    );

    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        {(label || showValue) && (
          <div className="flex items-center justify-between">
            {label && (
              <label
                htmlFor={id}
                className="text-sm text-vectosilo-text"
              >
                {label}
              </label>
            )}
            {showValue && (
              <motion.span
                key={value}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-medium text-vectosilo-accent"
              >
                {value}
              </motion.span>
            )}
          </div>
        )}

        <div
          className="relative h-6 flex items-center"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {/* Track background */}
          <div className="absolute left-0 right-0 h-1.5 rounded-full bg-vectosilo-border" />

          {/* Track fill */}
          <motion.div
            className="absolute left-0 h-1.5 rounded-full bg-vectosilo-accent"
            style={{ width: `${pct}%` }}
            layout
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />

          {/* Thumb */}
          <motion.div
            className="absolute z-10 flex items-center justify-center"
            style={{ left: `calc(${pct}% - 10px)` }}
            animate={{
              scale: dragging ? 1.3 : hover ? 1.15 : 1,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <div className="h-5 w-5 rounded-full border-2 border-vectosilo-accent bg-white shadow" />
          </motion.div>

          {/* Hidden native range */}
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            onMouseDown={() => setDragging(true)}
            onMouseUp={() => setDragging(false)}
            onTouchStart={() => setDragging(true)}
            onTouchEnd={() => setDragging(false)}
            className="absolute inset-0 z-20 cursor-pointer opacity-0"
            {...props}
          />
        </div>

        {/* Min/Max labels */}
        <div className="flex justify-between text-xs text-vectosilo-muted">
          <span>
            {min}
            {step < 1 ? "+" : ""}
          </span>
          <span>{max}</span>
        </div>
      </div>
    );
  }
);

SliderRange.displayName = "SliderRange";
