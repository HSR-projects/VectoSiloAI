// @ts-nocheck
// Template ID: page-landing-portfolio
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { HeroGradient } from "../components/HeroGradient";
import { Stats } from "../components/Stats";
import { Gallery } from "../components/Gallery";
import { Testimonials } from "../components/Testimonials";
import { CardBlog } from "../components/CardBlog";
import { Contact } from "../components/Contact";
import { PageTransition } from "../components/PageTransition";

const navLinks = [
  { label: "Work", href: "#work" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Blog", href: "#blog" },
  { label: "Contact", href: "#contact" },
];

const filters = ["All", "Web", "Mobile", "Design"];

const projectImages = [
  { src: "", alt: "E-commerce platform", caption: "E-commerce Platform - Web" },
  { src: "", alt: "Fitness app", caption: "Fitness Tracker - Mobile" },
  { src: "", alt: "Brand identity", caption: "Brand Identity - Design" },
  { src: "", alt: "Dashboard", caption: "Analytics Dashboard - Web" },
  { src: "", alt: "Social app", caption: "Social Connect - Mobile" },
  { src: "", alt: "Packaging design", caption: "Product Packaging - Design" },
  { src: "", alt: "SaaS platform", caption: "SaaS Platform - Web" },
  { src: "", alt: "Travel app", caption: "Travel Companion - Mobile" },
  { src: "", alt: "Logo collection", caption: "Logo Collection - Design" },
];

const testimonials = [
  {
    quote:
      "An absolute pleasure to work with. The attention to detail and creativity exceeded our expectations.",
    author: "Jessica Tran",
    role: "Product Manager, Finova",
    avatar: "https://i.pravatar.cc/150?u=jessica",
  },
  {
    quote:
      "Delivered a stunning product ahead of schedule. Highly recommend for any complex project.",
    author: "Daniel Lee",
    role: "CTO, CloudBase",
    avatar: "https://i.pravatar.cc/150?u=danielle",
  },
  {
    quote:
      "The best developer I have collaborated with. Clean code, great communication, excellent results.",
    author: "Rachel Adams",
    role: "Design Lead, Mosaic",
    avatar: "https://i.pravatar.cc/150?u=rachel",
  },
];

const blogPosts = [
  {
    image: "",
    date: "March 15, 2026",
    category: "Engineering",
    title: "Building Scalable Systems with Modern Architecture",
    excerpt:
      "A deep dive into designing distributed systems that handle millions of requests without breaking a sweat.",
    author: { name: "Alex Rivera", avatar: "https://i.pravatar.cc/150?u=alexr" },
    slug: "#",
  },
  {
    image: "",
    date: "February 28, 2026",
    category: "Design",
    title: "The Art of Minimalist UI Design",
    excerpt:
      "Why less is more in interface design and how to achieve elegant simplicity without sacrificing functionality.",
    author: { name: "Alex Rivera", avatar: "https://i.pravatar.cc/150?u=alexr" },
    slug: "#",
  },
  {
    image: "",
    date: "January 10, 2026",
    category: "Career",
    title: "Navigating the Freelance Developer Landscape",
    excerpt:
      "Lessons learned from five years of freelancing: pricing, clients, work-life balance, and growth.",
    author: { name: "Alex Rivera", avatar: "https://i.pravatar.cc/150?u=alexr" },
    slug: "#",
  },
];

export default function LandingPortfolio() {
  const [activeFilter, setActiveFilter] = useState("All");

  return (
    <PageTransition>
      <div className="min-h-screen bg-incogni-bg">
        <Navbar
          logo={<span className="text-xl font-bold text-incogni-text">Alex Rivera</span>}
          links={navLinks}
          cta={
            <div className="flex items-center gap-2">
              <a
                href="#"
                className="rounded-lg p-2 text-incogni-muted transition-colors hover:bg-incogni-surface hover:text-incogni-text"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="#"
                className="rounded-lg p-2 text-incogni-muted transition-colors hover:bg-incogni-surface hover:text-incogni-text"
                aria-label="Twitter"
              >
                <Twitter size={18} />
              </a>
              <a
                href="#"
                className="rounded-lg p-2 text-incogni-muted transition-colors hover:bg-incogni-surface hover:text-incogni-text"
                aria-label="LinkedIn"
              >
                <Linkedin size={18} />
              </a>
            </div>
          }
        />

        <HeroGradient
          title="Alex Rivera"
          subtitle="Full-Stack Developer & Designer. I craft digital experiences that blend beautiful design with rock-solid engineering."
          cta={{ label: "See My Work", href: "#work" }}
        />

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <Stats
            items={[
              { label: "Years Experience", value: 8, suffix: "+", icon: <Mail size={16} />, trend: "up" },
              { label: "Projects Completed", value: 120, suffix: "+", icon: <Mail size={16} />, trend: "up" },
              { label: "Happy Clients", value: 85, suffix: "+", icon: <Mail size={16} />, trend: "up" },
              { label: "Awards Won", value: 14, suffix: "", icon: <Mail size={16} />, trend: "up" },
            ]}
            columns={4}
          />
        </section>

        <section id="work" className="py-16 px-4">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-incogni-text sm:text-4xl">
              Featured projects
            </h2>
            <p className="mt-4 text-center text-lg text-incogni-muted">
              A curated selection of my best work across web, mobile, and design.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    activeFilter === filter
                      ? "bg-incogni-accent text-white"
                      : "border border-incogni-border text-incogni-muted hover:border-incogni-accent hover:text-incogni-accent"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mt-12"
              >
                <Gallery images={projectImages} columns={3} />
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <div id="testimonials">
          <Testimonials
            title="Kind words"
            testimonials={testimonials}
            variant="grid"
          />
        </div>

        <section id="blog" className="py-16 px-4">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-3xl font-bold text-incogni-text sm:text-4xl">
              Latest from the blog
            </h2>
            <p className="mt-4 text-center text-lg text-incogni-muted">
              Thoughts on engineering, design, and the developer experience.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post, i) => (
                <CardBlog key={i} {...post} />
              ))}
            </div>
          </div>
        </section>

        <div id="contact">
          <Contact
            title="Let's work together"
            subtitle="Have a project, question, or just want to say hi? Drop me a message."
            email="alex@rivera.dev"
            phone="+1 (555) 234-5678"
            address="San Francisco, CA"
          />
        </div>

        <footer className="border-t border-incogni-border bg-incogni-surface py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <span className="text-sm text-incogni-muted">
                &copy; {new Date().getFullYear()} Alex Rivera. All rights reserved.
              </span>
              <div className="flex gap-4">
                <a href="#" className="text-incogni-muted hover:text-incogni-text transition-colors">
                  <Github size={18} />
                </a>
                <a href="#" className="text-incogni-muted hover:text-incogni-text transition-colors">
                  <Twitter size={18} />
                </a>
                <a href="#" className="text-incogni-muted hover:text-incogni-text transition-colors">
                  <Linkedin size={18} />
                </a>
                <a href="#" className="text-incogni-muted hover:text-incogni-text transition-colors">
                  <Mail size={18} />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
