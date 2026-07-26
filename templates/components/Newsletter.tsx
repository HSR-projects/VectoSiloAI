// @ts-nocheck
// Template ID: marketing-newsletter
"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Check, Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface NewsletterProps {
  title: string;
  subtitle?: string;
  buttonText?: string;
  onSubmit?: (email: string) => void | Promise<void>;
  variant?: "simple" | "card" | "split";
  imageSrc?: string;
  className?: string;
}

export function Newsletter({
  title,
  subtitle,
  buttonText = "Subscribe",
  onSubmit,
  variant = "simple",
  imageSrc,
  className,
}: NewsletterProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !onSubmit) return;
    setLoading(true);
    try {
      await onSubmit(email);
      setSubscribed(true);
      setEmail("");
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      <h3 className="text-2xl font-bold text-incogni-text sm:text-3xl">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-2 text-sm text-incogni-muted">{subtitle}</p>
      )}
      {subscribed ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 flex items-center gap-2 text-incogni-accent"
        >
          <Check size={20} />
          <span className="text-sm font-medium">Subscribed successfully!</span>
        </motion.div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className={cn(
            "mt-6",
            variant === "simple"
              ? "flex flex-col gap-3 sm:flex-row"
              : "flex flex-col gap-3",
          )}
        >
          <div className="relative flex-1">
            <Mail
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-incogni-muted"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="w-full rounded-lg border border-incogni-border bg-incogni-surface py-3 pl-10 pr-3 text-sm text-incogni-text placeholder:text-incogni-muted outline-none transition-colors focus:border-incogni-accent"
            />
          </div>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors whitespace-nowrap",
              loading
                ? "bg-incogni-accent/70 cursor-not-allowed"
                : "bg-incogni-accent hover:bg-incogni-accent/90",
            )}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}
            {buttonText}
          </motion.button>
        </form>
      )}
    </>
  );

  if (variant === "card") {
    return (
      <section className={cn("py-16 px-4", className)}>
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-incogni-border bg-incogni-surface/50 backdrop-blur-xl p-8 text-center shadow-xl"
          >
            {formContent}
          </motion.div>
        </div>
      </section>
    );
  }

  if (variant === "split") {
    return (
      <section className={cn("py-16 px-4", className)}>
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-2xl border border-incogni-border bg-incogni-surface"
          >
            <div className="grid lg:grid-cols-2">
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                {formContent}
              </div>
              <div className="relative hidden lg:block min-h-[300px] bg-incogni-surface-2">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt="Newsletter"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Mail size={64} className="text-incogni-muted/30" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className={cn("py-16 px-4", className)}>
      <div className="mx-auto max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {formContent}
        </motion.div>
      </div>
    </section>
  );
}
