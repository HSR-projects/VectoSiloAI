// @ts-nocheck
// Template ID: card-blog
"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface CardBlogProps {
  image: string;
  date: string;
  category: string;
  title: string;
  excerpt: string;
  author: { name: string; avatar: string };
  slug: string;
  className?: string;
}

export function CardBlog({
  image,
  date,
  category,
  title,
  excerpt,
  author,
  slug,
  className,
}: CardBlogProps) {
  return (
    <Link href={slug} className={cn("group block no-underline text-inherit", className)}>
      <div className="rounded-xl border border-[#424242] bg-[#2f2f2f] overflow-hidden">
        <div className="relative h-48 w-full overflow-hidden">
          <motion.div
            className="h-full w-full"
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Image src={image} alt={title} fill className="object-cover" />
          </motion.div>
          <motion.span
            className="absolute top-3 left-3 bg-[#10a37f] text-white text-xs font-semibold px-2.5 py-0.5 rounded-full"
            whileHover={{ scale: 1.05 }}
          >
            {category}
          </motion.span>
        </div>
        <div className="p-4">
          <p className="text-xs text-[#8e8e93]">{date}</p>
          <h3 className="mt-1.5 text-base font-semibold text-[#ececec] group-hover:text-[#10a37f] transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="mt-1.5 text-sm text-[#8e8e93] line-clamp-2">{excerpt}</p>
          <div className="mt-4 flex items-center gap-2.5">
            <Image
              src={author.avatar}
              alt={author.name}
              width={28}
              height={28}
              className="rounded-full object-cover"
            />
            <span className="text-xs text-[#8e8e93]">{author.name}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
