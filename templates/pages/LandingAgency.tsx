// @ts-nocheck
// Template ID: page-landing-agency
"use client";

import { motion } from "framer-motion";
import {
  Palette,
  Code,
  Smartphone,
  Search,
  PenTool,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { HeroSplit } from "../components/HeroSplit";
import { LogoCloud } from "../components/LogoCloud";
import { FeaturesGrid } from "../components/FeaturesGrid";
import { Team } from "../components/Team";
import { Testimonials } from "../components/Testimonials";
import { Gallery } from "../components/Gallery";
import { Contact } from "../components/Contact";
import { PageTransition } from "../components/PageTransition";

const navLinks = [
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Team", href: "#team" },
  { label: "Contact", href: "#contact" },
];

const services = [
  {
    icon: "Palette" as const,
    title: "Web Design",
    description:
      "Beautiful, conversion-optimized websites that captivate your audience and drive results.",
  },
  {
    icon: "PenTool" as const,
    title: "Branding",
    description:
      "Strategic brand identity development that sets you apart from the competition.",
  },
  {
    icon: "Smartphone" as const,
    title: "Mobile Apps",
    description:
      "Native and cross-platform mobile applications with seamless user experiences.",
  },
  {
    icon: "Search" as const,
    title: "SEO",
    description:
      "Data-driven search optimization strategies that boost your organic visibility.",
  },
  {
    icon: "Code" as const,
    title: "Content Strategy",
    description:
      "Compelling content that tells your story and engages your target audience.",
  },
  {
    icon: "BarChart3" as const,
    title: "Analytics",
    description:
      "Deep insights and reporting to measure performance and inform decisions.",
  },
];

const teamMembers = [
  {
    name: "Sofia Martinez",
    role: "Creative Director",
    avatar: "https://i.pravatar.cc/150?u=sofia",
    bio: "15 years leading creative teams at top agencies.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "Liam O'Brien",
    role: "Lead Developer",
    avatar: "https://i.pravatar.cc/150?u=liam",
    bio: "Full-stack engineer with a passion for clean code.",
    social: [
      { icon: "github" as const, url: "#" },
      { icon: "twitter" as const, url: "#" },
    ],
  },
  {
    name: "Aisha Gupta",
    role: "UX Designer",
    avatar: "https://i.pravatar.cc/150?u=aisha",
    bio: "Human-centered designer focused on accessibility.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "Marcus Webb",
    role: "Brand Strategist",
    avatar: "https://i.pravatar.cc/150?u=marcusw",
    bio: "Helped 50+ brands find their voice and market fit.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "Yuki Tanaka",
    role: "Motion Designer",
    avatar: "https://i.pravatar.cc/150?u=yuki",
    bio: "Creating stunning animations that bring brands to life.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "Olivia Chen",
    role: "Project Manager",
    avatar: "https://i.pravatar.cc/150?u=olivia",
    bio: "Keeping complex projects on time and on budget.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
];

const testimonials = [
  {
    quote:
      "They did not just build a website; they built a complete digital presence that transformed our business.",
    author: "Ryan Murphy",
    role: "CEO, Brightline",
    avatar: "https://i.pravatar.cc/150?u=ryan",
  },
  {
    quote:
      "The most collaborative agency we have ever worked with. They truly became an extension of our team.",
    author: "Emma Watson",
    role: "CMO, Nexus Health",
    avatar: "https://i.pravatar.cc/150?u=emmaw",
  },
  {
    quote:
      "Our rebrand with this team increased our conversion rate by 340%. The ROI speaks for itself.",
    author: "Carlos Silva",
    role: "Founder, Urban Spaces",
    avatar: "https://i.pravatar.cc/150?u=carlos",
  },
  {
    quote:
      "From strategy to execution, every step was handled with precision and creativity.",
    author: "Naomi Park",
    role: "Director, GreenLeaf",
    avatar: "https://i.pravatar.cc/150?u=naomi",
  },
];

const portfolioImages = Array.from({ length: 6 }, (_, i) => ({
  src: "",
  alt: `Project ${i + 1}`,
  caption: `Project ${i + 1} - ${["Brand Identity", "Web App", "Mobile App", "E-Commerce", "Dashboard", "Landing Page"][i]}`,
}));

export default function LandingAgency() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-incogni-bg">
        <Navbar
          logo={<span className="text-xl font-bold text-incogni-text">StudioK</span>}
          links={navLinks}
          cta={
            <a
              href="#"
              className="rounded-lg bg-incogni-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-incogni-accent/90"
            >
              Let's Talk
            </a>
          }
        />

        <HeroSplit
          title="We Build Digital Experiences"
          subtitle="A creative studio that partners with ambitious brands to design and develop impactful digital products."
          cta={{ label: "View Our Work", href: "#work" }}
          image={
            <div className="flex h-80 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-incogni-accent/20 via-purple-500/20 to-incogni-surface-2">
              <div className="text-center">
                <PenTool className="mx-auto h-16 w-16 text-incogni-accent/60" />
                <p className="mt-4 text-sm text-incogni-muted">Creative Studio Showreel</p>
              </div>
            </div>
          }
        />

        <LogoCloud
          title="Trusted by industry leaders"
          logos={[
            { name: "Brand 1", src: "" },
            { name: "Brand 2", src: "" },
            { name: "Brand 3", src: "" },
            { name: "Brand 4", src: "" },
            { name: "Brand 5", src: "" },
            { name: "Brand 6", src: "" },
          ]}
        />

        <div id="services">
          <FeaturesGrid
            title="Our Services"
            subtitle="End-to-end digital solutions tailored to your business goals."
            features={services}
            columns={3}
          />
        </div>

        <div id="team">
          <Team
            title="Meet the team"
            subtitle="A diverse group of creators, engineers, and strategists."
            members={teamMembers}
          />
        </div>

        <Testimonials
          title="Client testimonials"
          testimonials={testimonials}
          variant="grid"
        />

        <section id="work" className="py-16 px-4">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-incogni-text sm:text-4xl">
              Featured work
            </h2>
            <p className="mt-4 text-center text-lg text-incogni-muted">
              A selection of projects we are proud to have been part of.
            </p>
            <div className="mt-12">
              <Gallery images={portfolioImages} columns={3} />
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-24">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(16,163,127,0.1) 0%, transparent 50%, rgba(16,163,127,0.05) 100%)",
            }}
          />
          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-incogni-text sm:text-5xl"
            >
              Ready to create something amazing?
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="mt-4 text-lg text-incogni-muted"
            >
              Let us collaborate and bring your vision to life.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-lg bg-incogni-accent px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-incogni-accent/90"
              >
                Start a Project <ArrowRight size={16} />
              </a>
            </motion.div>
          </div>
        </section>

        <div id="contact">
          <Contact
            title="Get in touch"
            subtitle="Have a project in mind? We would love to hear about it."
            email="hello@studiok.com"
            phone="+1 (555) 987-6543"
            address="350 Fifth Avenue, New York, NY 10118"
          />
        </div>

        <footer className="border-t border-incogni-border bg-incogni-surface py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <span className="text-sm text-incogni-muted">
                &copy; {new Date().getFullYear()} StudioK. All rights reserved.
              </span>
              <div className="flex gap-6 text-sm text-incogni-muted">
                <a href="#" className="hover:text-incogni-text transition-colors">Dribbble</a>
                <a href="#" className="hover:text-incogni-text transition-colors">Behance</a>
                <a href="#" className="hover:text-incogni-text transition-colors">Twitter</a>
                <a href="#" className="hover:text-incogni-text transition-colors">LinkedIn</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
