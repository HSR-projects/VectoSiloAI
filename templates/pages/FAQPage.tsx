// @ts-nocheck
// Template ID: page-faq
"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  X,
  ChevronDown,
  HelpCircle,
  Mail,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedSection } from "../components/AnimatedSection";
import { PageTransition } from "../components/PageTransition";

type FAQCategory = {
  id: string;
  label: string;
  items: { question: string; answer: string }[];
};

const categories: FAQCategory[] = [
  {
    id: "general",
    label: "General",
    items: [
      {
        question: "What is IncogniAI?",
        answer:
          "IncogniAI is an all-in-one platform for building, deploying, and scaling AI-powered applications. It provides tools for API management, analytics, team collaboration, and more.",
      },
      {
        question: "Who is IncogniAI for?",
        answer:
          "IncogniAI is designed for developers, engineering teams, and organizations of all sizes who want to build and ship AI-powered products efficiently.",
      },
      {
        question: "Is there a free trial?",
        answer:
          "Yes, we offer a 14-day free trial on all plans with no credit card required. You get full access to all features during the trial.",
      },
      {
        question: "Can I upgrade or downgrade my plan?",
        answer:
          "Absolutely. You can change your plan at any time. Upgrades take effect immediately, and downgrades apply at the next billing cycle.",
      },
    ],
  },
  {
    id: "account",
    label: "Account & Billing",
    items: [
      {
        question: "What payment methods do you accept?",
        answer:
          "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for annual enterprise plans.",
      },
      {
        question: "How do I cancel my subscription?",
        answer:
          "You can cancel anytime from your account dashboard. Your data will remain accessible for 30 days after cancellation.",
      },
      {
        question: "Do you offer refunds?",
        answer:
          "Yes, we offer a 30-day money-back guarantee on all plans. Contact our support team for a full refund if you are not satisfied.",
      },
      {
        question: "Can I have multiple team members on one account?",
        answer:
          "Yes, our Pro and Enterprise plans support multiple team members with role-based access control.",
      },
    ],
  },
  {
    id: "technical",
    label: "Technical",
    items: [
      {
        question: "What languages and frameworks do you support?",
        answer:
          "We provide SDKs for JavaScript/TypeScript, Python, Go, Rust, and Java. Our REST and GraphQL APIs work with any language.",
      },
      {
        question: "How does security work?",
        answer:
          "We use AES-256 encryption at rest, TLS 1.3 in transit, and our infrastructure is SOC 2 compliant with regular third-party audits.",
      },
      {
        question: "What is your uptime guarantee?",
        answer:
          "We guarantee 99.9% uptime for Pro plans and 99.99% for Enterprise plans, backed by our SLA.",
      },
      {
        question: "Can I self-host IncogniAI?",
        answer:
          "Enterprise customers can self-host using our Docker images. Contact sales for more information.",
      },
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    items: [
      {
        question: "What does the Enterprise plan include?",
        answer:
          "Enterprise includes unlimited usage, dedicated support, SSO, audit logs, custom SLAs, and personalized onboarding.",
      },
      {
        question: "Do you offer volume discounts?",
        answer:
          "Yes, we offer volume pricing for enterprise customers. Contact our sales team for a custom quote.",
      },
      {
        question: "Can I get a dedicated account manager?",
        answer:
          "Enterprise plans include a dedicated account manager who will help you get the most out of the platform.",
      },
      {
        question: "Do you support custom integrations?",
        answer:
          "Yes, our enterprise team can help build custom integrations for your specific needs.",
      },
    ],
  },
];

export default function FAQPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("general");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const currentCategory = categories.find((c) => c.id === activeCategory);

  const filtered = useMemo(() => {
    if (!currentCategory) return [];
    if (!search) return currentCategory.items;
    return currentCategory.items.filter(
      (item) =>
        item.question.toLowerCase().includes(search.toLowerCase()) ||
        item.answer.toLowerCase().includes(search.toLowerCase())
    );
  }, [currentCategory, search]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#212121]">
        <section className="px-4 py-20">
          <div className="mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <HelpCircle
                size={48}
                className="mx-auto text-[#10a37f]/40"
              />
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-[#ececec] sm:text-5xl">
                Frequently Asked Questions
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-[#8e8e93]">
                Find answers to common questions about IncogniAI. Can&apos;t find
                what you are looking for? Reach out to our support team.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative mt-8"
            >
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="w-full rounded-xl border border-[#424242] bg-[#2f2f2f] py-3.5 pl-11 pr-10 text-sm text-[#ececec] placeholder:text-[#8e8e93] outline-none transition-colors focus:border-[#10a37f]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-[#ececec]"
                >
                  <X size={16} />
                </button>
              )}
            </motion.div>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setOpenIndex(null);
                  }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                    activeCategory === cat.id
                      ? "bg-[#10a37f] text-white"
                      : "border border-[#424242] text-[#8e8e93] hover:border-[#10a37f] hover:text-[#10a37f]"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <motion.div layout className="mt-10 space-y-3">
              {filtered.length > 0 ? (
                filtered.map((item, i) => (
                  <motion.div
                    key={item.question}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden rounded-xl border border-[#424242] bg-[#2f2f2f]"
                  >
                    <button
                      onClick={() =>
                        setOpenIndex(openIndex === i ? null : i)
                      }
                      className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-[#343541]"
                    >
                      <span className="text-sm font-medium text-[#ececec]">
                        {item.question}
                      </span>
                      <motion.div
                        animate={{ rotate: openIndex === i ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown
                          size={18}
                          className="shrink-0 text-[#8e8e93]"
                        />
                      </motion.div>
                    </button>
                    {openIndex === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="border-t border-[#424242] px-4 pb-4 pt-3 text-sm leading-relaxed text-[#8e8e93]">
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                ))
              ) : (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-12 text-center text-sm text-[#8e8e93]"
                >
                  No results found for &ldquo;{search}&rdquo;
                </motion.p>
              )}
            </motion.div>
          </div>
        </section>

        <section className="border-t border-[#424242] bg-[#2f2f2f] px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Mail size={40} className="mx-auto text-[#10a37f]/40" />
              <h2 className="mt-4 text-3xl font-bold text-[#ececec]">
                Still Have Questions?
              </h2>
              <p className="mt-4 text-lg text-[#8e8e93]">
                Our support team is here to help. Reach out and we will get back
                to you within 24 hours.
              </p>
              <motion.a
                href="#"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#10a37f] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d8c6b]"
              >
                Contact Support
                <ArrowRight size={16} />
              </motion.a>
            </motion.div>
          </div>
        </section>

        <footer className="border-t border-[#424242] py-12">
          <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[#8e8e93]">
            &copy; {new Date().getFullYear()} IncogniAI. All rights reserved.
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
