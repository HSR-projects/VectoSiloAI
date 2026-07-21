// @ts-nocheck
// Template ID: page-landing-mobile
"use client";

import { Star } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { HeroBasic } from "../components/HeroBasic";
import { FeaturesGrid } from "../components/FeaturesGrid";
import { Testimonials } from "../components/Testimonials";
import { Stats } from "../components/Stats";
import { FAQ } from "../components/FAQ";
import { Newsletter } from "../components/Newsletter";
import { PageTransition } from "../components/PageTransition";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Reviews", href: "#reviews" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const features = [
  {
    icon: "Smartphone" as const,
    title: "Smart Dashboard",
    description:
      "Your personalized command center. See everything that matters at a single glance.",
  },
  {
    icon: "Bell" as const,
    title: "Intelligent Alerts",
    description:
      "Get notified about what matters, when it matters. AI-powered priority filtering.",
  },
  {
    icon: "Lock" as const,
    title: "Privacy First",
    description:
      "Your data stays yours. End-to-end encryption with zero-knowledge architecture.",
  },
  {
    icon: "Cloud" as const,
    title: "Cloud Sync",
    description:
      "Seamlessly sync across all your devices. Pick up exactly where you left off.",
  },
  {
    icon: "Zap" as const,
    title: "Lightning Performance",
    description:
      "Optimized for speed. Launch in under 300ms and navigate with zero lag.",
  },
  {
    icon: "Heart" as const,
    title: "Health Integration",
    description:
      "Deep integration with health and wellness tracking for a holistic lifestyle.",
  },
];

const testimonials = [
  {
    quote:
      "This app completely changed my daily routine. I do not know how I managed before this.",
    author: "Sophie Martin",
    role: "Verified User",
    avatar: "https://i.pravatar.cc/150?u=sophiem",
  },
  {
    quote:
      "The cleanest, most intuitive app I have ever used. Every feature feels thoughtfully designed.",
    author: "Ethan Clarke",
    role: "Verified User",
    avatar: "https://i.pravatar.cc/150?u=ethan",
  },
  {
    quote:
      "Finally, an app that respects my privacy while delivering an outstanding experience.",
    author: "Nina Patel",
    role: "Verified User",
    avatar: "https://i.pravatar.cc/150?u=ninap",
  },
];

const faqItems = [
  {
    question: "Is the app free to use?",
    answer:
      "Yes, the basic version is free forever. Premium features are available via subscription.",
  },
  {
    question: "Which platforms are supported?",
    answer:
      "The app is available on iOS 16+ and Android 13+. We also offer a web version for desktop.",
  },
  {
    question: "How does the privacy protection work?",
    answer:
      "All data is encrypted end-to-end using AES-256. We never sell or share your personal information with third parties.",
  },
  {
    question: "Can I use it offline?",
    answer:
      "Yes, core features work offline. Changes sync automatically when you reconnect to the internet.",
  },
  {
    question: "How often do you release updates?",
    answer:
      "We ship a major update every two weeks and bug fixes as needed. Our users vote on upcoming features.",
  },
  {
    question: "Is there a student discount?",
    answer:
      "Yes, we offer 50% off Premium for verified students. Contact our support team to apply.",
  },
];

export default function LandingMobile() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-vectosilo-bg">
        <Navbar
          logo={<span className="text-xl font-bold text-vectosilo-text">Flow</span>}
          links={navLinks}
          cta={
            <a
              href="#"
              className="rounded-lg bg-vectosilo-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-vectosilo-accent/90"
            >
              Download
            </a>
          }
        />

        <section className="flex min-h-[80vh] flex-col items-center justify-center px-4 lg:flex-row lg:gap-16">
          <div className="max-w-xl text-center lg:text-left">
            <HeroBasic
              title="Your Life, Simplified"
              subtitle="The all-in-one app that helps you organize, track, and improve every aspect of your daily life."
              primaryCta={{ label: "Download on the App Store", href: "#" }}
              secondaryCta={{ label: "Get it on Google Play", href: "#" }}
            />
          </div>
          <div className="mt-8 lg:mt-0">
            <div className="relative mx-auto h-[500px] w-[250px] rounded-[2.5rem] border-4 border-vectosilo-border bg-vectosilo-surface shadow-2xl">
              <div className="absolute left-1/2 top-0 h-5 w-28 -translate-x-1/2 rounded-b-xl bg-vectosilo-border" />
              <div className="flex h-full w-full items-center justify-center rounded-[2.25rem] bg-gradient-to-b from-vectosilo-accent/20 via-vectosilo-surface to-vectosilo-surface-2 p-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-vectosilo-accent/20 p-4">
                    <div className="h-full w-full rounded-lg bg-vectosilo-accent" />
                  </div>
                  <p className="text-2xl font-bold text-vectosilo-text">Flow</p>
                  <p className="mt-1 text-xs text-vectosilo-muted">Your life, simplified</p>
                  <div className="mt-6 space-y-3">
                    {["Today's Tasks", "Upcoming", "Habits"].map((item) => (
                      <div
                        key={item}
                        className="rounded-lg bg-vectosilo-surface-2/50 px-4 py-2 text-sm text-vectosilo-muted"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div id="features">
          <FeaturesGrid
            title="Everything you need, in one place"
            subtitle="Thoughtfully designed features that adapt to your lifestyle."
            features={features}
            columns={3}
          />
        </div>

        <div id="reviews">
          <Testimonials
            title="Loved by users worldwide"
            testimonials={testimonials}
            variant="cards"
          />
        </div>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <Stats
            items={[
              { label: "Total Downloads", value: 500000, suffix: "+", icon: <Star size={16} />, trend: "up" },
              { label: "Average Rating", value: 48, prefix: "", suffix: "/5", icon: <Star size={16} />, trend: "up" },
              { label: "Monthly Active Users", value: 125000, suffix: "+", icon: <Star size={16} />, trend: "up" },
              { label: "Countries", value: 90, suffix: "+", icon: <Star size={16} />, trend: "up" },
            ]}
            columns={4}
          />
        </section>

        <div id="faq">
          <FAQ
            title="Frequently asked questions"
            subtitle="Everything you need to know about Flow."
            items={faqItems}
          />
        </div>

        <Newsletter
          title="Join the beta waitlist"
          subtitle="Be the first to try new features and get exclusive early access updates."
          variant="card"
          buttonText="Join Waitlist"
        />

        <footer className="border-t border-vectosilo-border bg-vectosilo-surface py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="text-lg font-bold text-vectosilo-text">Flow</span>
                <p className="mt-2 text-sm text-vectosilo-muted">
                  Your life, simplified.
                </p>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-vectosilo-text">App</h4>
                <ul className="space-y-2 text-sm text-vectosilo-muted">
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Downloads</a></li>
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Updates</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-vectosilo-text">Support</h4>
                <ul className="space-y-2 text-sm text-vectosilo-muted">
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Contact</a></li>
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Terms</a></li>
                </ul>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-semibold text-vectosilo-text">Connect</h4>
                <ul className="space-y-2 text-sm text-vectosilo-muted">
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Twitter</a></li>
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Instagram</a></li>
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">TikTok</a></li>
                  <li><a href="#" className="hover:text-vectosilo-text transition-colors">Discord</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-10 border-t border-vectosilo-border pt-6 text-center text-sm text-vectosilo-muted">
              &copy; {new Date().getFullYear()} Flow. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
