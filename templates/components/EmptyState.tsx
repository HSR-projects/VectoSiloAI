// @ts-nocheck
// Template ID: feedback-empty
"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Inbox,
  SearchX,
  FileX,
  PackageOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  inbox: Inbox,
  searchx: SearchX,
  filex: FileX,
  packageopen: PackageOpen,
};

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps extends import("@/templates/utils/types").MotionDivProps {
  icon?: ReactNode | string;
  title: string;
  message: string;
  action?: EmptyStateAction;
}

export function EmptyState({
  icon = "inbox",
  title,
  message,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  const IconComponent =
    typeof icon === "string" ? iconMap[icon.toLowerCase()] ?? Inbox : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className
      )}
      {...rest}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="mb-4"
      >
        {typeof icon === "string" && IconComponent ? (
          <IconComponent className="w-16 h-16 text-[#424242]" />
        ) : (
          icon
        )}
      </motion.div>
      <h3 className="text-lg font-semibold text-[#ececec] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[#8e8e93] max-w-xs mb-6">{message}</p>
      {action && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          onClick={action.onClick}
          className={cn(
            "px-5 py-2 rounded-lg text-sm font-medium",
            "bg-[#10a37f] text-white",
            "hover:bg-[#0e8c6b] transition-colors"
          )}
        >
          {action.label}
        </motion.button>
      )}
    </div>
  );
}
