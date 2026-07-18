// @ts-nocheck
// Template ID: page-contact
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ } from "../components/FAQ";
import { PageTransition } from "../components/PageTransition";

const infoCards = [
  {
    icon: MapPin,
    title: "Our Office",
    content: "123 Innovation Drive, Suite 400\nSan Francisco, CA 94105",
  },
  {
    icon: Phone,
    title: "Phone",
    content: "+1 (555) 123-4567\nMon-Fri 9am-6pm PST",
  },
  {
    icon: Mail,
    title: "Email",
    content: "hello@kodaai.dev\nsupport@kodaai.dev",
  },
  {
    icon: Clock,
    title: "Business Hours",
    content: "Monday - Friday: 9:00 AM - 6:00 PM\nSaturday - Sunday: Closed",
  },
];

const faqItems = [
  {
    question: "How quickly do you respond to inquiries?",
    answer:
      "We typically respond within 24 hours during business days. Enterprise customers receive priority response within 4 hours.",
    category: "General",
  },
  {
    question: "Do you offer phone support?",
    answer:
      "Phone support is available for Pro and Enterprise customers during business hours. Enterprise customers get 24/7 phone support.",
    category: "Support",
  },
  {
    question: "Can I schedule a demo?",
    answer:
      "Absolutely! Fill out the contact form with 'Demo Request' in the subject line, and our team will reach out to schedule a personalized demo.",
    category: "General",
  },
  {
    question: "Where are you located?",
    answer:
      "Our headquarters is in San Francisco, CA, with remote team members distributed across the globe.",
    category: "General",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#212121]">
        <section className="px-4 py-20">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold tracking-tight text-[#ececec] sm:text-5xl">
                Get in Touch
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-[#8e8e93]">
                Have a question, feedback, or want to work with us? We would
                love to hear from you.
              </p>
            </motion.div>

            <div className="mt-16 grid gap-12 lg:grid-cols-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-3"
              >
                <div className="rounded-xl border border-[#424242] bg-[#2f2f2f] p-8">
                  <h2 className="text-xl font-semibold text-[#ececec]">
                    Send Us a Message
                  </h2>
                  {submitted ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-6 flex flex-col items-center justify-center py-12"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10a37f]/20">
                        <Check size={32} className="text-[#10a37f]" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-[#ececec]">
                        Message Sent!
                      </h3>
                      <p className="mt-2 text-sm text-[#8e8e93]">
                        Thank you for reaching out. We will get back to you
                        within 24 hours.
                      </p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-[#ececec]">
                            Name
                          </label>
                          <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) =>
                              setForm({ ...form, name: e.target.value })
                            }
                            placeholder="John Doe"
                            className="w-full rounded-lg border border-[#424242] bg-[#212121] px-4 py-2.5 text-sm text-[#ececec] placeholder:text-[#8e8e93] outline-none transition-colors focus:border-[#10a37f]"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium text-[#ececec]">
                            Email
                          </label>
                          <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) =>
                              setForm({ ...form, email: e.target.value })
                            }
                            placeholder="john@example.com"
                            className="w-full rounded-lg border border-[#424242] bg-[#212121] px-4 py-2.5 text-sm text-[#ececec] placeholder:text-[#8e8e93] outline-none transition-colors focus:border-[#10a37f]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[#ececec]">
                          Subject
                        </label>
                        <input
                          type="text"
                          required
                          value={form.subject}
                          onChange={(e) =>
                            setForm({ ...form, subject: e.target.value })
                          }
                          placeholder="How can we help?"
                          className="w-full rounded-lg border border-[#424242] bg-[#212121] px-4 py-2.5 text-sm text-[#ececec] placeholder:text-[#8e8e93] outline-none transition-colors focus:border-[#10a37f]"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-[#ececec]">
                          Message
                        </label>
                        <textarea
                          required
                          rows={5}
                          value={form.message}
                          onChange={(e) =>
                            setForm({ ...form, message: e.target.value })
                          }
                          placeholder="Tell us more about your inquiry..."
                          className="w-full resize-none rounded-lg border border-[#424242] bg-[#212121] px-4 py-2.5 text-sm text-[#ececec] placeholder:text-[#8e8e93] outline-none transition-colors focus:border-[#10a37f]"
                        />
                      </div>
                      <motion.button
                        type="submit"
                        disabled={submitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors sm:w-auto",
                          submitting
                            ? "cursor-not-allowed bg-[#10a37f]/70"
                            : "bg-[#10a37f] hover:bg-[#0d8c6b]"
                        )}
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send size={16} />
                            Send Message
                          </>
                        )}
                      </motion.button>
                    </form>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-2"
              >
                <div className="space-y-4">
                  {infoCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.title}
                        className="rounded-xl border border-[#424242] bg-[#2f2f2f] p-5"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#10a37f]/10">
                            <Icon size={20} className="text-[#10a37f]" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[#ececec]">
                              {card.title}
                            </h3>
                            <p className="mt-1 whitespace-pre-line text-sm text-[#8e8e93]">
                              {card.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <FAQ
          title="Frequently Asked Questions"
          subtitle="Quick answers to common questions."
          items={faqItems}
        />

        <footer className="border-t border-[#424242] bg-[#2f2f2f] py-12">
          <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[#8e8e93]">
            &copy; {new Date().getFullYear()} KodaAI. All rights reserved.
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
