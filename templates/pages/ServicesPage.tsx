// @ts-nocheck
// Template ID: page-services
"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import { cn } from "@/lib/utils";

interface ServiceCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  href?: string;
  price?: string;
}

interface ProcessStep {
  step: string;
  title: string;
  description: string;
}

interface ServicesPageProps {
  heroTitle: string;
  heroSubtitle: string;
  services: ServiceCard[];
  processTitle?: string;
  processSteps?: ProcessStep[];
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaLabel?: string;
  className?: string;
}

export function ServicesPage({
  heroTitle,
  heroSubtitle,
  services,
  processTitle = "How We Work",
  processSteps = [],
  ctaTitle = "Ready to get started?",
  ctaSubtitle = "Let us discuss your project and find the best solution for you.",
  ctaLabel = "Get in Touch",
  className,
}: ServicesPageProps) {
  return (
    <PageTransition>
      <div className={cn("min-h-screen bg-incogni-bg", className)}>
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="absolute inset-0 bg-gradient-to-b from-incogni-accent/5 to-transparent" />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-incogni-text sm:text-5xl lg:text-6xl"
            >
              {heroTitle}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-4 text-lg text-incogni-muted sm:text-xl max-w-2xl mx-auto"
            >
              {heroSubtitle}
            </motion.p>
          </div>
        </section>

        <section className="pb-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="group rounded-xl border border-incogni-border bg-incogni-surface p-6 transition-all duration-300 hover:border-incogni-accent/40 hover:shadow-lg hover:shadow-incogni-accent/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-incogni-accent/10 text-incogni-accent">
                    {service.icon}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-incogni-text">{service.title}</h3>
                  <p className="mt-2 text-sm text-incogni-muted leading-relaxed">
                    {service.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {service.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-incogni-muted">
                        <Check size={12} className="mt-0.5 flex-shrink-0 text-incogni-accent" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {service.price && (
                    <p className="mt-4 text-sm">
                      <span className="text-lg font-bold text-incogni-text">{service.price}</span>
                    </p>
                  )}
                  {service.href && (
                    <a
                      href={service.href}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-incogni-accent opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Learn more <ArrowRight size={14} />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {processSteps.length > 0 && (
          <section className="border-t border-incogni-border py-20">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-center text-3xl font-bold text-incogni-text sm:text-4xl"
              >
                {processTitle}
              </motion.h2>
              <div className="mt-12 space-y-8">
                {processSteps.map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex gap-5"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-incogni-accent text-sm font-bold text-white">
                        {step.step}
                      </div>
                      {i < processSteps.length - 1 && (
                        <div className="mt-2 h-full w-px bg-incogni-border" />
                      )}
                    </div>
                    <div className="pb-8">
                      <h3 className="text-lg font-semibold text-incogni-text">{step.title}</h3>
                      <p className="mt-1 text-sm text-incogni-muted">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="relative overflow-hidden border-t border-incogni-border py-20">
          <div className="absolute inset-0 bg-gradient-to-r from-incogni-accent/5 to-transparent" />
          <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-incogni-text sm:text-4xl"
            >
              {ctaTitle}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="mt-3 text-lg text-incogni-muted"
            >
              {ctaSubtitle}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-lg bg-incogni-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-incogni-accent/90"
              >
                {ctaLabel} <ArrowRight size={16} />
              </a>
            </motion.div>
          </div>
        </section>
      </div>
    </PageTransition>
  );
}
