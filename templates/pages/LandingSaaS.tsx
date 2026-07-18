// @ts-nocheck
// Template ID: page-landing-saas
"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Shield,
  Users,
  Link,
  BarChart3,
  Activity,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { HeroSplit } from "../components/HeroSplit";
import { LogoCloud } from "../components/LogoCloud";
import { FeaturesGrid } from "../components/FeaturesGrid";
import { Testimonials } from "../components/Testimonials";
import { PricingTable } from "../components/PricingTable";
import { FAQ } from "../components/FAQ";
import { Newsletter } from "../components/Newsletter";
import { PageTransition } from "../components/PageTransition";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];

const features = [
  {
    icon: "Zap" as const,
    title: "Lightning Fast",
    description:
      "Deploy globally with sub-millisecond response times. Our edge network ensures your data reaches users instantly.",
  },
  {
    icon: "Shield" as const,
    title: "Secure by Default",
    description:
      "Enterprise-grade encryption, SOC 2 compliance, and zero-trust architecture built into every layer.",
  },
  {
    icon: "Users" as const,
    title: "Team Collaboration",
    description:
      "Real-time editing, comments, and shared workspaces that keep your entire team in sync.",
  },
  {
    icon: "Link" as const,
    title: "API First",
    description:
      "RESTful and GraphQL APIs with SDKs in every language. Integrate seamlessly with your stack.",
  },
  {
    icon: "BarChart3" as const,
    title: "Analytics Dashboard",
    description:
      "Beautiful, customizable dashboards with real-time metrics, reports, and actionable insights.",
  },
  {
    icon: "Activity" as const,
    title: "99.99% Uptime",
    description:
      "Guaranteed availability with auto-scaling, failover, and multi-region redundancy built in.",
  },
];

const testimonials = [
  {
    quote:
      "This platform transformed how our team ships software. We went from weekly deploys to multiple per day with zero downtime.",
    author: "Sarah Chen",
    role: "CTO, TechFlow",
    avatar: "https://i.pravatar.cc/150?u=sarah",
  },
  {
    quote:
      "The best developer experience we have ever encountered. The API-first approach made integration effortless.",
    author: "Marcus Johnson",
    role: "Lead Engineer, DataSync",
    avatar: "https://i.pravatar.cc/150?u=marcus",
  },
  {
    quote:
      "We evaluated a dozen solutions and this was the clear winner. The security model alone is worth the investment.",
    author: "Priya Patel",
    role: "VP Engineering, CloudScale",
    avatar: "https://i.pravatar.cc/150?u=priya",
  },
];

const plans = [
  {
    name: "Starter",
    price: { monthly: "$19", yearly: "$190" },
    period: "month",
    description: "Perfect for small teams getting started.",
    features: [
      "Up to 5 team members",
      "10 GB storage",
      "100k API calls/month",
      "Basic analytics",
      "Email support",
    ],
    cta: { label: "Get Started", href: "#" },
  },
  {
    name: "Professional",
    price: { monthly: "$49", yearly: "$490" },
    period: "month",
    description: "For growing teams that need more power.",
    popular: true,
    features: [
      "Up to 20 team members",
      "100 GB storage",
      "1M API calls/month",
      "Advanced analytics",
      "Priority support",
      "Custom integrations",
    ],
    cta: { label: "Start Free Trial", href: "#" },
  },
  {
    name: "Enterprise",
    price: { monthly: "$149", yearly: "$1,490" },
    period: "month",
    description: "For large organizations with advanced needs.",
    features: [
      "Unlimited team members",
      "1 TB storage",
      "Unlimited API calls",
      "Custom analytics",
      "24/7 dedicated support",
      "SSO & audit logs",
      "SLA guarantee",
    ],
    cta: { label: "Contact Sales", href: "#" },
  },
];

const faqItems = [
  {
    question: "Can I upgrade my plan at any time?",
    answer:
      "Yes, you can upgrade or downgrade your plan at any time. When upgrading, you will be charged the prorated difference for the remainder of your billing cycle.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for annual enterprise plans.",
  },
  {
    question: "Is there a free trial available?",
    answer:
      "Yes, we offer a 14-day free trial on all plans with no credit card required. You will have full access to all features during the trial period.",
  },
  {
    question: "How does the security work?",
    answer:
      "We use AES-256 encryption at rest and TLS 1.3 in transit. All data is stored in SOC 2 compliant data centers with regular third-party audits.",
  },
  {
    question: "Can I cancel my subscription?",
    answer:
      "Absolutely. You can cancel anytime from your dashboard. Your data will remain accessible for 30 days after cancellation.",
  },
  {
    question: "Do you offer custom enterprise plans?",
    answer:
      "Yes, we offer custom plans with tailored pricing, dedicated support, and personalized onboarding for enterprise customers.",
  },
];

export default function LandingSaaS() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-koda-bg">
        <Navbar
          logo={<span className="text-xl font-bold text-koda-text">Product</span>}
          links={navLinks}
          cta={
            <a
              href="#"
              className="rounded-lg bg-koda-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-koda-accent/90"
            >
              Get Started
            </a>
          }
        />

        <HeroSplit
          title="Build Faster. Ship Smarter."
          subtitle="The all-in-one platform that empowers your team to build, deploy, and scale applications with unprecedented speed and reliability."
          cta={{ label: "Start Free Trial", href: "#" }}
          image={
            <div className="flex h-80 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-koda-accent/30 via-koda-surface to-koda-surface-2">
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-koda-accent/20 p-3 text-koda-accent">
                  <Zap className="h-full w-full" />
                </div>
                <p className="text-sm text-koda-muted">Product Dashboard Preview</p>
              </div>
            </div>
          }
        />

        <div id="about">
          <LogoCloud
            title="Trusted by leading teams"
            logos={[
              { name: "Company 1", src: "" },
              { name: "Company 2", src: "" },
              { name: "Company 3", src: "" },
              { name: "Company 4", src: "" },
              { name: "Company 5", src: "" },
              { name: "Company 6", src: "" },
            ]}
          />
        </div>

        <div id="features">
          <FeaturesGrid
            title="Everything you need to ship faster"
            subtitle="Powerful features designed to accelerate your development workflow from idea to production."
            features={features}
            columns={3}
          />
        </div>

        <Testimonials
          title="Loved by engineering teams"
          testimonials={testimonials}
          variant="cards"
        />

        <div id="pricing">
          <PricingTable plans={plans} />
        </div>

        <FAQ
          title="Frequently asked questions"
          subtitle="Everything you need to know about our platform."
          items={faqItems}
        />

        <Newsletter
          title="Stay in the loop"
          subtitle="Get product updates, tips, and exclusive offers delivered to your inbox."
          variant="card"
          buttonText="Subscribe"
        />

        <footer className="border-t border-koda-border bg-koda-surface py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-lg font-bold text-koda-text">Product</span>
                <p className="mt-2 text-sm text-koda-muted">
                  Building the future of software development.
                </p>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-koda-text">Product</h4>
                <ul className="space-y-2 text-sm text-koda-muted">
                  <li><a href="#" className="hover:text-koda-text transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-koda-text transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-koda-text transition-colors">Integrations</a></li>
                  <li><a href="#" className="hover:text-koda-text transition-colors">Changelog</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-koda-text">Company</h4>
                <ul className="space-y-2 text-sm text-koda-muted">
                  <li><a href="#" className="hover:text-koda-text transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-koda-text transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-koda-text transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-koda-text transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-koda-text">Legal</h4>
                <ul className="space-y-2 text-sm text-koda-muted">
                  <li><a href="#" className="hover:text-koda-text transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-koda-text transition-colors">Terms</a></li>
                  <li><a href="#" className="hover:text-koda-text transition-colors">Security</a></li>
                  <li><a href="#" className="hover:text-koda-text transition-colors">Cookies</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-10 border-t border-koda-border pt-6 text-center text-sm text-koda-muted">
              &copy; {new Date().getFullYear()} Product. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
