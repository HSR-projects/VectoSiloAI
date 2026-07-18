// @ts-nocheck
// Template ID: card-flip
"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CardFlipProps extends import("@/templates/utils/types").MotionDivProps {
  front: ReactNode;
  back: ReactNode;
}

export function CardFlip({ front, back, className, ...rest }: CardFlipProps) {
  return (
    <div className={cn("perspective-1000", className)} {...rest}>
      <motion.div
        className="relative w-full h-64 [transform-style:preserve-3d]"
        whileHover={{ rotateY: 180 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <div className="absolute inset-0 rounded-xl bg-[#2f2f2f] border border-[#424242] p-6 backface-hidden">
          {front}
        </div>
        <div
          className="absolute inset-0 rounded-xl p-6 backface-hidden [transform:rotateY(180deg)]"
          style={{
            background: "linear-gradient(135deg, #10a37f, #3b82f6)",
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}
