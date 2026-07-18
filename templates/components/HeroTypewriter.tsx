// @ts-nocheck
// Template ID: hero-typewriter
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HeroCta {
  label: string;
  href: string;
}

interface HeroTypewriterProps extends import("@/templates/utils/types").MotionDivProps {
  title: string;
  subtitle?: string;
  cta?: HeroCta;
  words?: string[];
}

export function HeroTypewriter({
  title,
  subtitle,
  cta,
  words = [],
  className,
  ...rest
}: HeroTypewriterProps) {
  const [displayedTitle, setDisplayedTitle] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (words.length === 0) return;

    const currentWord = words[wordIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && charIndex < currentWord.length) {
      timeout = setTimeout(() => {
        setDisplayedTitle(currentWord.slice(0, charIndex + 1));
        setCharIndex((p) => p + 1);
      }, 80);
    } else if (!deleting && charIndex === currentWord.length) {
      timeout = setTimeout(() => setDeleting(true), 2000);
    } else if (deleting && charIndex > 0) {
      timeout = setTimeout(() => {
        setDisplayedTitle(currentWord.slice(0, charIndex - 1));
        setCharIndex((p) => p - 1);
      }, 40);
    } else if (deleting && charIndex === 0) {
      setDeleting(false);
      setWordIndex((p) => (p + 1) % words.length);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, deleting, wordIndex, words]);

  return (
    <section
      className={cn("flex min-h-[70vh] items-center justify-center px-4", className)}
      {...rest}
    >
      <div className="max-w-3xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-4xl font-bold tracking-tight text-koda-text sm:text-5xl lg:text-6xl"
        >
          {title}{" "}
          {words.length > 0 && (
            <span className="text-koda-accent">
              {displayedTitle}
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                className="inline-block w-[2px] bg-koda-accent ml-0.5 align-middle"
                style={{ height: "0.85em" }}
              />
            </span>
          )}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-koda-muted sm:text-xl"
          >
            {subtitle}
          </motion.p>
        )}
        {cta && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-8"
          >
            <a
              href={cta.href}
              className="inline-block rounded-lg bg-koda-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-koda-accent-dim"
            >
              {cta.label}
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
