// @ts-nocheck
// Template ID: card-testimonial
"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CardTestimonialProps {
  avatar: string;
  name: string;
  role: string;
  quote: string;
  rating?: number;
  className?: string;
}

export function CardTestimonial({
  avatar,
  name,
  role,
  quote,
  rating = 5,
  className,
}: CardTestimonialProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-[#424242] bg-[#2f2f2f] p-6",
        className
      )}
    >
      <span className="absolute top-4 left-4 text-5xl leading-none text-[#10a37f]/20 select-none pointer-events-none font-serif">
        &ldquo;
      </span>
      <p className="relative z-10 mt-4 text-sm leading-relaxed text-[#8e8e93] italic">
        {quote}
      </p>
      <div className="mt-4 flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
          >
            <Star
              size={14}
              className={i < rating ? "fill-[#10a37f] text-[#10a37f]" : "text-[#424242]"}
            />
          </motion.span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Image
          src={avatar}
          alt={name}
          width={36}
          height={36}
          className="rounded-full object-cover"
        />
        <div>
          <p className="text-sm font-semibold text-[#ececec]">{name}</p>
          <p className="text-xs text-[#8e8e93]">{role}</p>
        </div>
      </div>
    </div>
  );
}
