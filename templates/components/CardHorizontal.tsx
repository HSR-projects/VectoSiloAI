// @ts-nocheck
// Template ID: card-horizontal
"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CardHorizontalProps {
  image?: string;
  imageAlt?: string;
  overline?: string;
  title: string;
  description: string;
  href?: string;
  tags?: string[];
  stats?: { label: string; value: string }[];
  className?: string;
}

export function CardHorizontal({
  image,
  imageAlt = "",
  overline,
  title,
  description,
  href,
  tags,
  stats,
  className,
}: CardHorizontalProps) {
  const content = (
    <div className="flex flex-col overflow-hidden rounded-xl border border-vectosilo-border bg-vectosilo-surface transition-colors hover:bg-vectosilo-surface/80 sm:flex-row">
      {image && (
        <div className="relative h-48 flex-shrink-0 overflow-hidden sm:h-auto sm:w-56 lg:w-72">
          <img
            src={image}
            alt={imageAlt}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
        <div>
          {overline && (
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-vectosilo-accent">
              {overline}
            </p>
          )}
          <h3 className="text-lg font-semibold text-vectosilo-text sm:text-xl">{title}</h3>
          <p className="mt-2 text-sm text-vectosilo-muted leading-relaxed line-clamp-3">
            {description}
          </p>
          {tags && tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-vectosilo-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-vectosilo-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          {stats && (
            <div className="flex gap-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-sm font-bold text-vectosilo-text">{s.value}</p>
                  <p className="text-[10px] text-vectosilo-muted">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          {href && (
            <span className="flex items-center gap-1 text-sm font-medium text-vectosilo-accent opacity-0 transition-opacity group-hover:opacity-100">
              View details <ArrowRight size={14} />
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn("group", className)}
      >
        <Link href={href} className="block no-underline text-inherit">
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn("group", className)}
    >
      {content}
    </motion.div>
  );
}
