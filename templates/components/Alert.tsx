// @ts-nocheck
// Template ID: feedback-alert
"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AlertType = "info" | "success" | "warning" | "error";

interface AlertProps extends import("@/templates/utils/types").MotionDivProps {
  type?: AlertType;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const icons: Record<AlertType, ReactNode> = {
  info: <Info className="w-5 h-5 text-[#3b82f6]" />,
  success: <CheckCircle className="w-5 h-5 text-[#10a37f]" />,
  warning: <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />,
  error: <XCircle className="w-5 h-5 text-[#ef4444]" />,
};

const borderAccents: Record<AlertType, string> = {
  info: "border-l-[#3b82f6]",
  success: "border-l-[#10a37f]",
  warning: "border-l-[#f59e0b]",
  error: "border-l-[#ef4444]",
};

const bgAccents: Record<AlertType, string> = {
  info: "bg-[#3b82f6]/10",
  success: "bg-[#10a37f]/10",
  warning: "bg-[#f59e0b]/10",
  error: "bg-[#ef4444]/10",
};

export function Alert({
  type = "info",
  title,
  message,
  dismissible = false,
  onDismiss,
  className,
  ...rest
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border border-[#424242] border-l-4",
        borderAccents[type],
        bgAccents[type],
        className
      )}
      role="alert"
      {...rest}
    >
      <span className="mt-0.5 shrink-0">{icons[type]}</span>
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold text-sm text-[#ececec] mb-0.5">
            {title}
          </p>
        )}
        <p className="text-sm text-[#8e8e93]">{message}</p>
      </div>
      {dismissible && (
        <button
          onClick={() => {
            setDismissed(true);
            onDismiss?.();
          }}
          className="shrink-0 text-[#8e8e93] hover:text-[#ececec] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}
