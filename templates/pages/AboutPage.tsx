// @ts-nocheck
// Template ID: page-about
"use client";

import { motion } from "framer-motion";
import { Users, Globe, Award, ArrowRight, Rocket } from "lucide-react";
import { HeroSplit } from "../components/HeroSplit";
import { Stats } from "../components/Stats";
import { Timeline } from "../components/Timeline";
import { Team } from "../components/Team";
import { Testimonials } from "../components/Testimonials";
import { Newsletter } from "../components/Newsletter";
import { AnimatedSection } from "../components/AnimatedSection";
import { PageTransition } from "../components/PageTransition";

const placeholderImg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23343441' width='800' height='600'/%3E%3C/svg%3E";

const stats = [
  { label: "Years in Business", value: 8, suffix: "+", icon: <Award size={18} />, trend: "up" as const },
  { label: "Active Users", value: 250000, suffix: "+", icon: <Users size={18} />, trend: "up" as const },
  { label: "Team Members", value: 120, suffix: "+", icon: <Users size={18} />, trend: "up" as const },
  { label: "Countries Served", value: 45, suffix: "", icon: <Globe size={18} />, trend: "up" as const },
];

const milestones = [
  {
    date: "2018",
    title: "Company Founded",
    description:
      "KodaAI was founded in San Francisco with a mission to democratize AI development.",
  },
  {
    date: "2019",
    title: "First Product Launch",
    description:
      "Released our first API product, serving 1,000 developers in the first month.",
  },
  {
    date: "2020",
    title: "Series A Funding",
    description:
      "Raised $10M in Series A funding to expand our team and infrastructure.",
  },
  {
    date: "2021",
    title: "1 Million API Calls",
    description:
      "Reached 1 million API calls per day milestone with 99.99% uptime.",
  },
  {
    date: "2023",
    title: "Global Expansion",
    description:
      "Opened offices in London, Tokyo, and Sydney. Team grew to 120+ members.",
  },
  {
    date: "2025",
    title: "Enterprise Platform",
    description:
      "Launched enterprise platform with SSO, audit logs, and dedicated support.",
  },
  {
    date: "2026",
    title: "Series B & Beyond",
    description:
      "Raised $50M Series B. Serving 250,000+ active users across 45 countries.",
  },
];

const teamMembers = [
  {
    name: "Alex Chen",
    role: "CEO & Co-Founder",
    avatar: placeholderImg,
    bio: "Former CTO of TechStart. Passionate about building tools that empower developers.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
      { icon: "github" as const, url: "#" },
    ],
  },
  {
    name: "Sarah Kim",
    role: "CTO & Co-Founder",
    avatar: placeholderImg,
    bio: "PhD in Computer Science. Previously led engineering teams at Google and Meta.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "Marcus Johnson",
    role: "VP of Engineering",
    avatar: placeholderImg,
    bio: "15+ years building distributed systems at scale. Open source contributor.",
    social: [
      { icon: "github" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "Priya Patel",
    role: "Head of Design",
    avatar: placeholderImg,
    bio: "Design leader with a passion for accessible and beautiful user interfaces.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "David Kim",
    role: "VP of Sales",
    avatar: placeholderImg,
    bio: "Built and scaled sales teams at multiple SaaS companies from $1M to $100M ARR.",
    social: [
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "Emily Zhang",
    role: "Head of Marketing",
    avatar: placeholderImg,
    bio: "Growth marketing expert who has launched products used by millions worldwide.",
    social: [
      { icon: "twitter" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "Ryan O'Brien",
    role: "Lead Infrastructure Engineer",
    avatar: placeholderImg,
    bio: "Cloud infrastructure specialist and CNCF contributor. Keeps our platform running.",
    social: [
      { icon: "github" as const, url: "#" },
      { icon: "linkedin" as const, url: "#" },
    ],
  },
  {
    name: "Aisha Patel",
    role: "Head of People",
    avatar: placeholderImg,
    bio: "Building an inclusive culture where amazing people can do their best work.",
    social: [
      { icon: "linkedin" as const, url: "#" },
    ],
  },
];

const testimonials = [
  {
    quote:
      "KodaAI has completely transformed how our engineering team builds and ships products. The platform is incredibly intuitive.",
    author: "Jennifer Walsh",
    role: "CTO, CloudScale Inc.",
    avatar: placeholderImg,
  },
  {
    quote:
      "The best developer experience I have encountered in my 15-year career. The documentation is fantastic.",
    author: "Tom Martinez",
    role: "Lead Engineer, DataFlow",
    avatar: placeholderImg,
  },
  {
    quote:
      "We evaluated a dozen platforms before choosing KodaAI. The decision was clear after seeing their security model.",
    author: "Linda Park",
    role: "VP Engineering, SafeNet",
    avatar: placeholderImg,
  },
];

export default function AboutPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-[#212121]">
        <HeroSplit
          title="Our Mission: Empowering Developers Worldwide"
          subtitle="We believe that great tools enable great work. KodaAI is building the platform that helps developers create, deploy, and scale applications with unprecedented ease."
          cta={{ label: "Join Our Team", href: "#" }}
          image={
            <div className="flex h-80 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#10a37f]/30 via-[#343541] to-[#212121]">
              <Rocket size={64} className="text-[#10a37f]/40" />
            </div>
          }
        />

        <AnimatedSection>
          <AnimatedSection>
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-3xl font-bold text-[#ececec] sm:text-4xl">
                Our Story
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[#8e8e93]">
                KodaAI started in a small garage in San Francisco with a simple
                idea: building AI-powered applications should be as easy as
                writing a few lines of code. Today, we are a global team of over
                120 passionate individuals working to make that vision a reality
                for developers everywhere.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-[#8e8e93]">
                From our early days serving a handful of developers to now
                powering applications used by millions, our commitment to
                developer experience, reliability, and innovation has never
                wavered.
              </p>
            </div>
          </AnimatedSection>

          <div className="mt-16">
            <Stats items={stats} columns={4} />
          </div>

          <div className="mt-24">
            <h2 className="mb-12 text-center text-3xl font-bold text-[#ececec] sm:text-4xl">
              Our Journey
            </h2>
            <Timeline items={milestones} />
          </div>
        </AnimatedSection>

        <section className="px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <Team
              title="Meet the Team"
              subtitle="The people behind KodaAI."
              members={teamMembers}
            />
          </div>
        </section>

        <Testimonials
          title="What People Say"
          testimonials={testimonials}
          variant="cards"
        />

        <section className="border-t border-[#424242] px-4 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold text-[#ececec]">
                Join Us on This Journey
              </h2>
              <p className="mt-4 text-lg text-[#8e8e93]">
                We are always looking for talented people who share our vision.
                Come build the future with us.
              </p>
              <motion.a
                href="#"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#10a37f] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0d8c6b]"
              >
                View Open Positions
                <ArrowRight size={16} />
              </motion.a>
            </motion.div>
          </div>
        </section>

        <Newsletter
          title="Stay Updated"
          subtitle="Get the latest news and updates from the KodaAI team."
          variant="card"
          buttonText="Subscribe"
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
