// @ts-nocheck
// Template ID: marketing-contact
"use client";

import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InputAnimated } from "./InputAnimated";
import { TextareaAnimated } from "./TextareaAnimated";

export interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ContactProps {
  title: string;
  subtitle?: string;
  email?: string;
  phone?: string;
  address?: string;
  onSubmit?: (data: ContactFormData) => void | Promise<void>;
  className?: string;
}

export function Contact({
  title,
  subtitle,
  email,
  phone,
  address,
  onSubmit,
  className,
}: ContactProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;
    setLoading(true);
    try {
      await onSubmit(form);
      setForm({ name: "", email: "", subject: "", message: "" });
    } finally {
      setLoading(false);
    }
  };

  const infoItems = [
    { icon: Mail, label: "Email", value: email },
    { icon: Phone, label: "Phone", value: phone },
    { icon: MapPin, label: "Address", value: address },
  ].filter((item) => item.value);

  return (
    <section className={cn("py-16 px-4", className)}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-koda-text sm:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 text-lg text-koda-muted">{subtitle}</p>
          )}
        </motion.div>

        <div className="mt-12 grid gap-10 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-6 lg:col-span-2"
          >
            {infoItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-koda-accent/10">
                    <Icon size={18} className="text-koda-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-koda-muted">
                      {item.label}
                    </p>
                    <p className="mt-1 text-sm text-koda-text">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </motion.div>

          <motion.form
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            onSubmit={handleSubmit}
            className="space-y-4 lg:col-span-3"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <InputAnimated
                label="Name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                icon={<Mail size={16} />}
              />
              <InputAnimated
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, email: e.target.value }))
                }
                required
                icon={<Mail size={16} />}
              />
            </div>
            <InputAnimated
              label="Subject"
              value={form.subject}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, subject: e.target.value }))
              }
            />
            <TextareaAnimated
              label="Message"
              value={form.message}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, message: e.target.value }))
              }
              required
              rows={5}
            />
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors",
                loading
                  ? "bg-koda-accent/70 cursor-not-allowed"
                  : "bg-koda-accent hover:bg-koda-accent/90",
              )}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              {loading ? "Sending..." : "Send Message"}
            </motion.button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}
