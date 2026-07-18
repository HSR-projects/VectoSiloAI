// @ts-nocheck
// Template ID: page-waitlist
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Sparkles, Star, Mail, Clock } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import { cn } from "@/lib/utils";

interface FeaturePreview {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface SocialProof {
  avatar: string;
  name: string;
  role: string;
  quote: string;
}

interface WaitlistPageProps {
  productName: string;
  tagline: string;
  description: string;
  features: FeaturePreview[];
  socialProof?: SocialProof[];
  waitlistCount?: number;
  launchDate?: string;
  className?: string;
}

export function WaitlistPage({
  productName,
  tagline,
  description,
  features,
  socialProof,
  waitlistCount = 0,
  launchDate,
  className,
}: WaitlistPageProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <PageTransition>
      <div className={cn("min-h-screen bg-koda-bg", className)}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-koda-accent/5 via-transparent to-transparent" />
          <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-koda-accent/5 blur-3xl" />
          <div className="absolute top-40 right-10 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 inline-flex items-center gap-2 rounded-full bg-koda-accent/10 px-3 py-1 text-xs font-medium text-koda-accent"
                >
                  <Sparkles size={12} /> Coming Soon
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl font-bold text-koda-text sm:text-5xl lg:text-6xl"
                >
                  {productName}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 text-xl text-koda-muted"
                >
                  {tagline}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 text-sm text-koda-muted leading-relaxed"
                >
                  {description}
                </motion.p>

                {!submitted ? (
                  <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    onSubmit={handleSubmit}
                    className="mt-8 flex flex-col gap-3 sm:flex-row"
                  >
                    <div className="relative flex-1">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-koda-muted"
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        className="w-full rounded-lg border border-koda-border bg-koda-surface py-3 pl-10 pr-4 text-sm text-koda-text placeholder:text-koda-muted focus:border-koda-accent focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-koda-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-koda-accent/90 disabled:opacity-60"
                    >
                      {loading ? "Joining..." : "Join Waitlist"}
                      {!loading && <ArrowRight size={16} />}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-8 rounded-xl border border-koda-accent/30 bg-koda-accent/5 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-koda-accent/20">
                        <Check size={18} className="text-koda-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-koda-text">You are on the list!</p>
                        <p className="text-xs text-koda-muted mt-0.5">
                          We will notify you at {email} when we launch.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="mt-6 flex flex-wrap items-center gap-4 text-xs text-koda-muted"
                >
                  {waitlistCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Star size={12} className="text-koda-accent" />{" "}
                      {waitlistCount.toLocaleString()} people on waitlist
                    </span>
                  )}
                  {launchDate && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> Launching {launchDate}
                    </span>
                  )}
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="relative hidden lg:block"
              >
                <div className="rounded-2xl border border-koda-border bg-gradient-to-br from-koda-surface to-koda-surface-2 p-8">
                  <div className="grid gap-4">
                    {features.slice(0, 4).map((f, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg bg-koda-bg/50 p-3">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-koda-accent/10 text-koda-accent">
                          {f.icon}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-koda-text">{f.title}</p>
                          <p className="text-xs text-koda-muted mt-0.5">{f.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <section className="pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center text-2xl font-bold text-koda-text sm:text-3xl"
            >
              What you will get
            </motion.h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-xl border border-koda-border bg-koda-surface p-5 transition-colors hover:border-koda-accent/30"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-koda-accent/10 text-koda-accent">
                    {f.icon}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-koda-text">{f.title}</h3>
                  <p className="mt-1 text-sm text-koda-muted">{f.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {socialProof && socialProof.length > 0 && (
          <section className="border-t border-koda-border py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center text-2xl font-bold text-koda-text sm:text-3xl"
              >
                Early supporters
              </motion.h2>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {socialProof.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="rounded-xl border border-koda-border bg-koda-surface p-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium text-koda-text">{p.name}</p>
                        <p className="text-xs text-koda-muted">{p.role}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-koda-muted italic">&ldquo;{p.quote}&rdquo;</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </PageTransition>
  );
}
