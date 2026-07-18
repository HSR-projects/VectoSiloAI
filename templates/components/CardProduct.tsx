// @ts-nocheck
// Template ID: card-product
"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Star, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CardProductProps {
  image: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  badge?: string;
  onAddToCart?: () => void;
  className?: string;
}

export function CardProduct({
  image,
  name,
  price,
  originalPrice,
  rating,
  badge,
  onAddToCart,
  className,
}: CardProductProps) {
  return (
    <div className={cn("group rounded-xl border border-[#424242] bg-[#2f2f2f] overflow-hidden", className)}>
      <div className="relative h-56 w-full overflow-hidden">
        <motion.div
          className="h-full w-full"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <Image src={image} alt={name} fill className="object-cover" />
        </motion.div>
        {badge && (
          <motion.span
            className="absolute top-3 left-3 bg-[#10a37f] text-white text-xs font-semibold px-2.5 py-0.5 rounded-full"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            {badge}
          </motion.span>
        )}
        <motion.button
          className="absolute bottom-0 left-0 right-0 bg-[#10a37f] text-white py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          initial={{ y: 60 }}
          whileHover={{ y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={onAddToCart}
        >
          <ShoppingCart size={16} />
          Add to Cart
        </motion.button>
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-[#ececec] line-clamp-1">{name}</h3>
        <div className="mt-1 flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={12}
              className={i < rating ? "fill-[#10a37f] text-[#10a37f]" : "text-[#424242]"}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-lg font-bold text-[#ececec]">${price.toFixed(2)}</span>
          {originalPrice && (
            <span className="text-sm text-[#8e8e93] line-through">${originalPrice.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
