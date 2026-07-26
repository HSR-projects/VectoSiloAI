// @ts-nocheck
// Template ID: marketing-logocloud
"use client";

import { useRef, type ReactNode } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LogoItem {
  name: string;
  url?: string;
  src: string;
}

export interface LogoCloudProps {
  title?: string;
  logos: LogoItem[];
  animated?: boolean;
  className?: string;
}

export function LogoCloud({
  title,
  logos,
  animated = false,
  className,
}: LogoCloudProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const logoElements = logos.map((logo, i) => (
    <div
      key={`${logo.name}-${i}`}
      className="flex h-12 w-28 items-center justify-center grayscale transition-all duration-300 hover:grayscale-0 hover:scale-110"
    >
      {logo.url ? (
        <Link
          href={logo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center"
        >
          <Image
            src={logo.src}
            alt={logo.name}
            width={80}
            height={32}
            className="max-h-8 w-auto object-contain opacity-60 transition-opacity hover:opacity-100"
          />
        </Link>
      ) : (
        <Image
          src={logo.src}
          alt={logo.name}
          width={80}
          height={32}
          className="max-h-8 w-auto object-contain opacity-60 transition-opacity hover:opacity-100"
        />
      )}
    </div>
  ));

  return (
    <section className={cn("py-16 px-4", className)}>
      <div className="mx-auto max-w-6xl">
        {title && (
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-incogni-muted"
          >
            {title}
          </motion.p>
        )}

        {animated ? (
          <div className="relative overflow-hidden" ref={trackRef}>
            <motion.div
              className="flex gap-12"
              animate={{
                x: ["0%", "-50%"],
              }}
              transition={{
                duration: 25,
                ease: "linear",
                repeat: Infinity,
              }}
            >
              <div className="flex shrink-0 gap-12">{logoElements}</div>
              <div className="flex shrink-0 gap-12">{logoElements}</div>
            </motion.div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-incogni-bg to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-incogni-bg to-transparent" />
          </div>
        ) : (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
            className="flex flex-wrap items-center justify-center gap-8"
          >
            {logos.map((logo, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, scale: 0.8 },
                  visible: { opacity: 1, scale: 1 },
                }}
              >
                {logo.url ? (
                  <Link
                    href={logo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-14 w-32 items-center justify-center grayscale transition-all duration-300 hover:grayscale-0 hover:scale-110"
                  >
                    <Image
                      src={logo.src}
                      alt={logo.name}
                      width={100}
                      height={40}
                      className="max-h-10 w-auto object-contain opacity-60 transition-opacity hover:opacity-100"
                    />
                  </Link>
                ) : (
                  <div className="flex h-14 w-32 items-center justify-center grayscale transition-all duration-300 hover:grayscale-0 hover:scale-110">
                    <Image
                      src={logo.src}
                      alt={logo.name}
                      width={100}
                      height={40}
                      className="max-h-10 w-auto object-contain opacity-60 transition-opacity hover:opacity-100"
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
