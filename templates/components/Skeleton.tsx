// @ts-nocheck
// Template ID: feedback-skeleton
"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SkeletonVariant = "text" | "card" | "image" | "avatar" | "custom";

interface SkeletonProps extends import("@/templates/utils/types").MotionDivProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  count?: number;
  children?: ReactNode;
}

const variantDefaults: Record<
  SkeletonVariant,
  { className: string; width?: string; height?: string }
> = {
  text: { className: "h-4 rounded", width: "100%" },
  card: {
    className: "rounded-xl",
    width: "100%",
    height: "160px",
  },
  image: {
    className: "rounded-lg",
    width: "100%",
    height: "200px",
  },
  avatar: {
    className: "rounded-full",
    width: "40px",
    height: "40px",
  },
  custom: { className: "" },
};

function SkeletonItem({
  variant = "text",
  width,
  height,
  className,
}: Omit<SkeletonProps, "count" | "children">) {
  const defaults = variantDefaults[variant];
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[#2f2f2f]",
        defaults.className,
        className
      )}
      style={{
        width: width ?? defaults.width,
        height: height ?? defaults.height,
      }}
    >
      <div
        className={cn(
          "absolute inset-0",
          "bg-gradient-to-r from-transparent via-[#343541]/60 to-transparent",
          "animate-[shimmer_1.5s_infinite]"
        )}
        style={{
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export function Skeleton({
  variant = "text",
  width,
  height,
  count = 1,
  children,
  className,
  ...rest
}: SkeletonProps) {
  if (variant === "custom" && children) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className={cn("relative overflow-hidden", className)}
        {...rest}
      >
        <div className="opacity-0">{children}</div>
        <div className="absolute inset-0 bg-[#2f2f2f]">
          <div
            className={cn(
              "absolute inset-0",
              "bg-gradient-to-r from-transparent via-[#343541]/60 to-transparent",
              "animate-[shimmer_1.5s_infinite]"
            )}
            style={{
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s ease-in-out infinite",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("flex flex-col gap-3", className)}
      {...rest}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem
          key={i}
          variant={variant}
          width={width}
          height={
            variant === "text" && count > 1
              ? undefined
              : height
          }
        />
      ))}
      {count > 1 && variant === "text" && (
        <SkeletonItem
          variant="text"
          width="60%"
          height={undefined}
        />
      )}
    </div>
  );
}
