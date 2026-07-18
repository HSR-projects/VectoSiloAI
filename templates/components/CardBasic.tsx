// @ts-nocheck
// Template ID: card-basic
"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CardBasicProps extends import("@/templates/utils/types").MotionDivProps {
  children: ReactNode;
  href?: string;
}

export function CardBasic({ children, className, href, onClick, ...rest }: CardBasicProps) {
  return (
    <motion.div
      className={cn(
        "rounded-xl border border-[#424242] bg-[#2f2f2f] p-6 cursor-pointer",
        className
      )}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      {...rest}
    >
      {href ? (
        <Link href={href} className="block h-full w-full no-underline text-inherit">
          {children}
        </Link>
      ) : (
        children
      )}
    </motion.div>
  );
}
