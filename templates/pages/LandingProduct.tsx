// @ts-nocheck
// Template ID: page-landing-product
"use client";

import {
  Camera,
  Headphones,
  Watch,
  Smartphone,
  Monitor,
  Gift,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { HeroBasic } from "../components/HeroBasic";
import { Carousel } from "../components/Carousel";
import { FeaturesGrid } from "../components/FeaturesGrid";
import { CardPricing } from "../components/CardPricing";
import { FAQ } from "../components/FAQ";
import { Newsletter } from "../components/Newsletter";
import { PageTransition } from "../components/PageTransition";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Reviews", href: "#reviews" },
  { label: "Support", href: "#support" },
];

const features = [
  {
    icon: "Camera" as const,
    title: "Ultra HD Camera",
    description:
      "Capture every moment in stunning 4K resolution with advanced image stabilization.",
  },
  {
    icon: "Headphones" as const,
    title: "Immersive Audio",
    description:
      "Spatial audio with active noise cancellation for a truly cinematic experience.",
  },
  {
    icon: "Watch" as const,
    title: "All-Day Battery",
    description:
      "Up to 48 hours of usage on a single charge. Never worry about running out of power.",
  },
  {
    icon: "Smartphone" as const,
    title: "Seamless Ecosystem",
    description:
      "Works flawlessly across all your devices. Pick up where you left off, instantly.",
  },
  {
    icon: "Monitor" as const,
    title: "Stunning Display",
    description:
      "ProMotion XDR display with 2,000 nits peak brightness and true-to-life colors.",
  },
  {
    icon: "Gift" as const,
    title: "Premium Design",
    description:
      "Crafted from aerospace-grade materials. Beautifully designed, inside and out.",
  },
];

const carouselItems = [
  {
    id: 1,
    content: (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/20 via-incogni-surface to-purple-500/20 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-48 w-48 rounded-3xl bg-gradient-to-br from-incogni-accent/40 to-blue-500/40 shadow-2xl" />
          <p className="text-sm text-incogni-muted">Product Shot - Front View</p>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    content: (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500/20 via-incogni-surface to-pink-500/20 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-48 w-48 rounded-3xl bg-gradient-to-br from-purple-500/40 to-pink-500/40 shadow-2xl" />
          <p className="text-sm text-incogni-muted">Product Shot - Side View</p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    content: (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-500/20 via-incogni-surface to-teal-500/20 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 h-48 w-48 rounded-3xl bg-gradient-to-br from-green-500/40 to-teal-500/40 shadow-2xl" />
          <p className="text-sm text-incogni-muted">Product Shot - Detail View</p>
        </div>
      </div>
    ),
  },
];

const pricingTiers = [
  {
    name: "Essential",
    price: "$299",
    period: "one-time",
    features: [
      "Full product warranty",
      "Standard shipping",
      "30-day return policy",
      "Email support",
    ],
    cta: { label: "Buy Now", href: "#" },
  },
  {
    name: "Pro",
    price: "$499",
    period: "one-time",
    popular: true,
    features: [
      "Everything in Essential",
      "Premium accessories kit",
      "Express shipping",
      "Priority support",
      "2-year extended warranty",
    ],
    cta: { label: "Buy Now", href: "#" },
  },
  {
    name: "Ultimate",
    price: "$799",
    period: "one-time",
    features: [
      "Everything in Pro",
      "Limited edition finish",
      "VIP onboarding session",
      "Lifetime warranty",
      "Exclusive member club",
      "Free upgrades for 3 years",
    ],
    cta: { label: "Buy Now", href: "#" },
  },
];

const faqItems = [
  {
    question: "What is the return policy?",
    answer:
      "We offer a 30-day no-questions-asked return policy. If you are not satisfied, return it for a full refund.",
  },
  {
    question: "How long does shipping take?",
    answer:
      "Standard shipping takes 5-7 business days. Express shipping delivers in 1-2 business days.",
  },
  {
    question: "Is there a warranty?",
    answer:
      "Yes, all products come with a 1-year limited warranty. Extended warranty options are available.",
  },
  {
    question: "Can I finance my purchase?",
    answer:
      "Yes, we offer 0% APR financing for 12 months through our partner Affirm on orders over $299.",
  },
  {
    question: "Do you ship internationally?",
    answer:
      "Yes, we ship to over 60 countries worldwide. Duties and taxes may apply based on your location.",
  },
  {
    question: "What is included in the box?",
    answer:
      "The product, charging cable, quick start guide, and warranty card. Pro and Ultimate tiers include additional accessories.",
  },
];

export default function LandingProduct() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-incogni-bg">
        <Navbar
          logo={<span className="text-xl font-bold text-incogni-text">Luxora</span>}
          links={navLinks}
          cta={
            <a
              href="#"
              className="rounded-lg bg-incogni-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-incogni-accent/90"
            >
              Buy Now
            </a>
          }
        />

        <HeroBasic
          title="Redefine What's Possible"
          subtitle="Experience the next generation of innovation. Engineered for those who demand the very best."
          primaryCta={{ label: "Buy Now", href: "#" }}
          secondaryCta={{ label: "Learn More", href: "#" }}
        />

        <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
          <Carousel
            items={carouselItems}
            autoPlay
            interval={5000}
            showDots
            showArrows
          />
        </section>

        <div id="features">
          <FeaturesGrid
            title="Designed to impress"
            subtitle="Every detail meticulously crafted for the best experience."
            features={features}
            columns={3}
          />
        </div>

        <section
          id="pricing"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8"
        >
          <h2 className="text-center text-3xl font-bold text-incogni-text sm:text-4xl">
            Choose your edition
          </h2>
          <p className="mt-4 text-center text-lg text-incogni-muted">
            Find the perfect configuration for your lifestyle.
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pricingTiers.map((tier, i) => (
              <CardPricing key={i} {...tier} />
            ))}
          </div>
        </section>

        <FAQ
          title="Got questions?"
          subtitle="We have answers. Find everything you need to know below."
          items={faqItems}
        />

        <Newsletter
          title="Stay ahead of the curve"
          subtitle="Be the first to know about new products, exclusive offers, and early access drops."
          variant="split"
          buttonText="Subscribe"
        />

        <footer className="border-t border-incogni-border bg-incogni-surface py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-lg font-bold text-incogni-text">Luxora</span>
                <p className="mt-2 text-sm text-incogni-muted">
                  Premium products for modern living.
                </p>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-incogni-text">Shop</h4>
                <ul className="space-y-2 text-sm text-incogni-muted">
                  <li><a href="#" className="hover:text-incogni-text transition-colors">All Products</a></li>
                  <li><a href="#" className="hover:text-incogni-text transition-colors">New Arrivals</a></li>
                  <li><a href="#" className="hover:text-incogni-text transition-colors">Best Sellers</a></li>
                  <li><a href="#" className="hover:text-incogni-text transition-colors">Accessories</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-incogni-text">Support</h4>
                <ul className="space-y-2 text-sm text-incogni-muted">
                  <li><a href="#" className="hover:text-incogni-text transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-incogni-text transition-colors">FAQ</a></li>
                  <li><a href="#" className="hover:text-incogni-text transition-colors">Shipping</a></li>
                  <li><a href="#" className="hover:text-incogni-text transition-colors">Returns</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-incogni-text">Company</h4>
                <ul className="space-y-2 text-sm text-incogni-muted">
                  <li><a href="#" className="hover:text-incogni-text transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-incogni-text transition-colors">Press</a></li>
                  <li><a href="#" className="hover:text-incogni-text transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-incogni-text transition-colors">Privacy</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-10 border-t border-incogni-border pt-6 text-center text-sm text-incogni-muted">
              &copy; {new Date().getFullYear()} Luxora. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
