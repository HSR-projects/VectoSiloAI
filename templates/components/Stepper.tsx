// @ts-nocheck
// Template ID: ui-stepper
"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Stepper({
  steps,
  currentStep,
  orientation = "horizontal",
  className,
}: StepperProps) {
  return (
    <div
      className={cn(
        orientation === "horizontal"
          ? "flex items-center"
          : "flex flex-col gap-0",
        className
      )}
    >
      {steps.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        const isLast = i === steps.length - 1;

        return (
          <div
            key={i}
            className={cn(
              "flex",
              orientation === "horizontal"
                ? "items-center"
                : "flex-col"
            )}
          >
            <div className="flex items-center gap-3">
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                  borderColor: isCompleted || isCurrent ? "rgb(16,163,127)" : "rgb(66,66,66)",
                  backgroundColor: isCompleted ? "rgb(16,163,127)" : isCurrent ? "rgba(16,163,127,0.15)" : "rgb(47,47,47)",
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
                  isCompleted && "border-vectosilo-accent bg-vectosilo-accent text-white",
                  isCurrent && "border-vectosilo-accent bg-vectosilo-accent/15 text-vectosilo-accent",
                  !isCompleted && !isCurrent && "border-vectosilo-border bg-vectosilo-surface text-vectosilo-muted"
                )}
              >
                {isCompleted ? (
                  <Check size={16} className="text-white" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </motion.div>
              <div className={cn(orientation === "vertical" && "pb-6")}>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted && "text-vectosilo-accent",
                    isCurrent && "text-vectosilo-text",
                    !isCompleted && !isCurrent && "text-vectosilo-muted"
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="text-xs text-vectosilo-muted mt-0.5 max-w-[200px]">
                    {step.description}
                  </p>
                )}
              </div>
            </div>

            {!isLast && (
              <div
                className={cn(
                  "relative",
                  orientation === "horizontal"
                    ? "mx-4 h-px w-16 min-w-[2rem] flex-shrink"
                    : "ml-5 h-8 w-px"
                )}
              >
                <div
                  className={cn(
                    "absolute inset-0 rounded-full transition-colors duration-500",
                    i < currentStep ? "bg-vectosilo-accent" : "bg-vectosilo-border"
                  )}
                />
                <motion.div
                  initial={{ scaleX: 0, scaleY: 0 }}
                  animate={{
                    scaleX: i < currentStep ? 1 : 0,
                    scaleY: i < currentStep ? 1 : 0,
                  }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    "absolute inset-0 rounded-full origin-left",
                    orientation === "vertical" && "origin-top",
                    "bg-vectosilo-accent"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
