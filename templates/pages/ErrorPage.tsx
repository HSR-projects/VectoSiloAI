// @ts-nocheck
// Template ID: page-error
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileSearch, AlertTriangle, Home, HeadphonesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageTransition } from "../components/PageTransition";

type ErrorVariant = "404" | "500";

interface ErrorPageProps {
  variant?: ErrorVariant;
}

const errorConfig = {
  "404": {
    number: "404",
    icon: FileSearch,
    title: "Page Not Found",
    message:
      "Looks like this page wandered off into the digital wilderness. The link might be broken, or the page may have moved to a new location.",
    tip: "While you are here, did you know that 404 is also the number of HTTP status codes that exist? Just kidding, there are way more.",
  },
  "500": {
    number: "500",
    icon: AlertTriangle,
    title: "Server Error",
    message:
      "Our servers are having a moment. We have been notified and are looking into it. This is usually temporary, so give it another try soon.",
    tip: "Fun fact: The first computer bug was an actual moth found in a Harvard Mark II computer in 1947. Our bugs are digital, but we squash them just the same.",
  },
};

export default function ErrorPage({ variant = "404" }: ErrorPageProps) {
  const config = errorConfig[variant];
  const Icon = config.icon;
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PageTransition>
      <div className="flex min-h-screen items-center justify-center bg-[#212121] px-4">
        <div className="mx-auto max-w-lg text-center">
          <motion.div
            animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <motion.span
              className="block text-[12rem] font-bold leading-none tracking-tighter sm:text-[16rem]"
              style={{
                background:
                  "linear-gradient(135deg, #10a37f 0%, #0d8c6b 30%, #343541 70%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 150,
                damping: 12,
                delay: 0.1,
              }}
            >
              {config.number}
            </motion.span>
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="mt-32 sm:mt-44">
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Icon
                    size={64}
                    className="mx-auto text-[#10a37f]/30"
                  />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="-mt-8"
          >
            <h1 className="text-3xl font-bold text-[#ececec] sm:text-4xl">
              {config.title}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#8e8e93]">
              {config.message}
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm italic text-[#8e8e93]/60">
              {config.tip}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <motion.a
              href="/"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#10a37f] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d8c6b]"
            >
              <Home size={16} />
              Go Home
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 rounded-lg border border-[#424242] px-6 py-3 text-sm font-semibold text-[#ececec] transition-colors hover:bg-[#2f2f2f]"
            >
              <HeadphonesIcon size={16} />
              Contact Support
            </motion.a>
          </motion.div>

          {variant === "500" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-xs text-[#8e8e93]/40"
            >
              Auto-recovering... Please wait
            </motion.p>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
