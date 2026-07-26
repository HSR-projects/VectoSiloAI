// @ts-nocheck
// Template ID: ui-rating
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  value?: number;
  max?: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
  showValue?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function Rating({
  value = 0,
  max = 5,
  onChange,
  size = "md",
  readOnly = false,
  showValue = false,
  className,
}: RatingProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = starValue <= display;
        const half = !filled && starValue - 0.5 <= display;

        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readOnly && setHovered(starValue)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            className={cn(
              "relative transition-transform",
              !readOnly && "cursor-pointer hover:scale-110"
            )}
            aria-label={`Rate ${starValue} out of ${max}`}
          >
            <Star
              className={cn(
                sizeMap[size],
                "transition-colors duration-150",
                filled
                  ? "text-yellow-400 fill-yellow-400"
                  : half
                    ? "text-yellow-400/30"
                    : "text-incogni-border"
              )}
            />
            {half && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                <Star
                  className={cn(sizeMap[size], "text-yellow-400 fill-yellow-400")}
                />
              </div>
            )}
          </button>
        );
      })}
      {showValue && (
        <motion.span
          key={display}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="ml-2 text-sm font-medium text-incogni-muted tabular-nums"
        >
          {display}/{max}
        </motion.span>
      )}
    </div>
  );
}
