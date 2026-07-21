// @ts-nocheck
// Template ID: ui-avatar
"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Avatar {
  src?: string;
  alt?: string;
  initials?: string;
  fallback?: ReactNode;
}

interface AvatarGroupProps {
  avatars: Avatar[];
  max?: number;
  size?: "sm" | "md" | "lg";
  overlap?: number;
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

export function AvatarGroup({
  avatars,
  max = 4,
  size = "md",
  overlap = 3,
  className,
}: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const remainder = avatars.length - max;

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((avatar, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          style={{ marginLeft: i === 0 ? 0 : -overlap * 4 }}
          className={cn(
            "relative rounded-full border-2 border-vectosilo-bg bg-vectosilo-surface-2 flex items-center justify-center overflow-hidden",
            sizeMap[size]
          )}
          title={avatar.alt}
        >
          {avatar.src ? (
            <img
              src={avatar.src}
              alt={avatar.alt || ""}
              className="h-full w-full object-cover"
            />
          ) : avatar.initials ? (
            <span className="font-medium text-vectosilo-text">{avatar.initials}</span>
          ) : (
            avatar.fallback || <span className="text-vectosilo-muted">?</span>
          )}
        </motion.div>
      ))}
      {remainder > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: visible.length * 0.05 }}
          style={{ marginLeft: -overlap * 4 }}
          className={cn(
            "relative rounded-full border-2 border-vectosilo-bg bg-vectosilo-surface-2 flex items-center justify-center",
            sizeMap[size]
          )}
        >
          <span className="text-xs font-medium text-vectosilo-muted">+{remainder}</span>
        </motion.div>
      )}
    </div>
  );
}
