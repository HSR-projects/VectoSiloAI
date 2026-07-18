// @ts-nocheck
// Template ID: card-image
"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface CardImageProps {
  src: string;
  alt: string;
  title: string;
  description: string;
  href?: string;
  overlay?: boolean;
  className?: string;
}

export function CardImage({
  src,
  alt,
  title,
  description,
  href,
  overlay = true,
  className,
}: CardImageProps) {
  const content = (
    <div className={cn("relative overflow-hidden rounded-xl group cursor-pointer", className)}>
      <motion.div
        className="relative h-64 w-full overflow-hidden"
        whileHover={{ scale: 1.08 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Image src={src} alt={alt} fill className="object-cover" />
      </motion.div>
      {overlay && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6"
          initial={{ opacity: 0, y: 20 }}
          whileHover={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-[#ececec]">{title}</h3>
          <p className="mt-1 text-sm text-[#8e8e93]">{description}</p>
        </motion.div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block no-underline text-inherit">{content}</Link>;
  }

  return content;
}
