// @ts-nocheck
// Template ID: feedback-error
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorStateProps extends import("@/templates/utils/types").MotionDivProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  error,
  onRetry,
  className,
  ...rest
}: ErrorStateProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className
      )}
      {...rest}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mb-4"
      >
        <AlertCircle className="w-14 h-14 text-[#ef4444]" />
      </motion.div>
      <h3 className="text-lg font-semibold text-[#ececec] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[#8e8e93] max-w-sm mb-6">{message}</p>
      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium",
              "bg-[#10a37f] text-white",
              "hover:bg-[#0e8c6b] transition-colors"
            )}
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>
      {error && (
        <div className="mt-6 w-full max-w-md">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="inline-flex items-center gap-1.5 text-xs text-[#8e8e93] hover:text-[#ececec] transition-colors"
          >
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 transition-transform",
                expanded && "rotate-180"
              )}
            />
            Error details
          </button>
          {expanded && (
            <motion.pre
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "mt-2 p-3 rounded-lg text-xs text-left overflow-auto",
                "bg-[#2f2f2f] border border-[#424242]",
                "text-[#ef4444] font-mono"
              )}
            >
              {error.name}: {error.message}
              {error.stack && `\n\n${error.stack}`}
            </motion.pre>
          )}
        </div>
      )}
    </motion.div>
  );
}
