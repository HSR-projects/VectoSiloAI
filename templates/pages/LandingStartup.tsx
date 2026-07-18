// @ts-nocheck
// Template ID: page-landing-startup
"use client";

import { motion } from "framer-motion";
import {
  Users,
  TrendingUp,
  Globe,
  Handshake,
  Lightbulb,
  Rocket,
  Target,
  Zap,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { HeroGradient } from "../components/HeroGradient";
import { FeaturesGrid } from "../components/FeaturesGrid";
import { Stats } from "../components/Stats";
import { Testimonials } from "../components/Testimonials";
import { Team } from "../components/Team";
import { Contact } from "../components/Contact";
import { PageTransition } from "../components/PageTransition";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "About", href: "#about" },
  { label: "Team", href: "#team" },
  { label: "Contact", href: "#contact" },
];

const features = [
  {
    icon: "Lightbulb" as const,
    title: "Innovative Solutions",
    description:
      "Cutting-edge technology that redefines what is possible in the industry.",
  },
  {
    icon: "Rocket" as const,
    title: "Fast Iteration",
    description:
      "Rapid prototyping and deployment cycles that keep you ahead of the competition.",
  },
  {
    icon: "Users" as const,
    title: "Community Driven",
    description:
      "Built with input from thousands of users to solve real-world problems.",
  },
  {
    icon: "Target" as const,
    title: "Precision Engineered",
    description:
      "Every feature is meticulously crafted for maximum impact and usability.",
  },
  {
    icon: "Globe" as const,
    title: "Global Reach",
    description:
      "Deploy anywhere in the world with localized experiences out of the box.",
  },
  {
    icon: "Handshake" as const,
    title: "Partnership First",
    description:
      "We succeed when you succeed. Dedicated support every step of the way.",
  },
];

const testimonials = [
  {
    quote:
      "This startup platform gave us the leverage we needed to scale from zero to launch in record time.",
    author: "Alex Rivera",
    role: "Founder, NexGen",
    avatar: "https://i.pravatar.cc/150?u=alex",
  },
  {
    quote:
      "The innovation here is unmatched. It is rare to find a product that understands startup velocity so well.",
    author: "Jordan Kim",
    role: "CEO, BrightPath",
    avatar: "https://i.pravatar.cc/150?u=jordan",
  },
  {
    quote:
      "From day one, the platform felt like it was built specifically for our workflow. Game changer.",
    author: "Taylor Brooks",
    role: "CTO, Launchpad",
    avatar: "https://i.pravatar.cc/150?u=taylor",
  },
];

const teamMembers = [
  {
    name: "Elena Voss",
    role: "CEO & Co-Founder",
    avatar: "https://i.pravatar.cc/150?u=elena",
    bio: "Former Y Combinator partner with 15 years of startup experience.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "David Kim",
    role: "CTO & Co-Founder",
    avatar: "https://i.pravatar.cc/150?u=davidk",
    bio: "Ex-Google engineer and open source contributor.",
    social: [
      { icon: "github" as const, url: "#" },
      { icon: "twitter" as const, url: "#" },
    ],
  },
  {
    name: "Maya Singh",
    role: "Head of Design",
    avatar: "https://i.pravatar.cc/150?u=maya",
    bio: "Award-winning designer who has shipped products used by millions.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "James Carter",
    role: "Head of Growth",
    avatar: "https://i.pravatar.cc/150?u=jamesc",
    bio: "Growth hacker behind multiple unicorn startup trajectories.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
];

export default function LandingStartup() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-koda-bg">
        <Navbar
          logo={<span className="text-xl font-bold text-koda-text">StartupOS</span>}
          links={navLinks}
          cta={
            <a
              href="#"
              className="rounded-lg bg-koda-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-koda-accent/90"
            >
              Get Early Access
            </a>
          }
        />

        <HeroGradient
          title="The Future of Technology is Here"
          subtitle="An all-in-one operating system for startups that want to move fast, break things, and build the future."
          cta={{ label: "Join the Waitlist", href: "#" }}
        />

        <section className="relative py-16">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "linear-gradient(180deg, rgba(16,163,127,0.08) 0%, transparent 50%, rgba(16,163,127,0.05) 100%)",
            }}
          />
          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <Stats
              items={[
                {
                  label: "Active Users",
                  value: 25000,
                  prefix: "",
                  suffix: "+",
                  icon: <Users size={16} />,
                  trend: "up",
                },
                {
                  label: "Revenue Growth",
                  value: 340,
                  prefix: "$",
                  suffix: "K+",
                  icon: <TrendingUp size={16} />,
                  trend: "up",
                },
                {
                  label: "Countries Reached",
                  value: 85,
                  suffix: "+",
                  icon: <Globe size={16} />,
                  trend: "up",
                },
                {
                  label: "Partners",
                  value: 120,
                  suffix: "+",
                  icon: <Handshake size={16} />,
                  trend: "up",
                },
              ]}
              columns={4}
            />
          </div>
        </section>

        <div id="features">
          <FeaturesGrid
            title="Built for the modern startup"
            subtitle="Everything you need to ideate, build, and scale your vision."
            features={features}
            columns={3}
          />
        </div>

        <section className="relative py-16">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(16,163,127,0.1) 0%, transparent 70%)",
            }}
          />
          <div className="relative z-10">
            <Testimonials
              title="What founders are saying"
              testimonials={testimonials}
              variant="grid"
            />
          </div>
        </section>

        <div id="team">
          <Team
            title="Meet the team"
            subtitle="A passionate group of builders, thinkers, and doers."
            members={teamMembers}
          />
        </div>

        <div id="contact">
          <Contact
            title="Get in touch"
            subtitle="Have a question or want to learn more? We would love to hear from you."
            email="hello@startupos.com"
            phone="+1 (555) 123-4567"
            address="548 Market St, San Francisco, CA 94104"
          />
        </div>

        <footer className="border-t border-koda-border bg-koda-surface py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <span className="text-sm text-koda-muted">
                &copy; {new Date().getFullYear()} StartupOS. All rights reserved.
              </span>
              <div className="flex gap-6 text-sm text-koda-muted">
                <a href="#" className="hover:text-koda-text transition-colors">Privacy</a>
                <a href="#" className="hover:text-koda-text transition-colors">Terms</a>
                <a href="#" className="hover:text-koda-text transition-colors">Twitter</a>
                <a href="#" className="hover:text-koda-text transition-colors">LinkedIn</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
