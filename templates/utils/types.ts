import type { ReactNode, CSSProperties } from "react";
import type { MotionProps } from "framer-motion";

export type MotionDivProps = MotionProps &
  Omit<React.HTMLAttributes<HTMLDivElement>, keyof MotionProps | "onDrag" | "onDragStart" | "onDragEnd"> & {
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
  };

export type MotionButtonProps = MotionProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof MotionProps | "onDrag" | "onDragStart" | "onDragEnd"> & {
    children?: ReactNode;
    className?: string;
  };

export type MotionSpanProps = MotionProps &
  Omit<React.HTMLAttributes<HTMLSpanElement>, keyof MotionProps | "onDrag" | "onDragStart" | "onDragEnd"> & {
    children?: ReactNode;
    className?: string;
  };

export type MotionHeadingProps = MotionProps &
  Omit<React.HTMLAttributes<HTMLHeadingElement>, keyof MotionProps | "onDrag" | "onDragStart" | "onDragEnd"> & {
    children?: ReactNode;
    className?: string;
  };
