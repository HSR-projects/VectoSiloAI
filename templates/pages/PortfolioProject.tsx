// @ts-nocheck
// Template ID: page-portfolio-project
"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Github, Calendar, Tag } from "lucide-react";
import { PageTransition } from "../components/PageTransition";
import { cn } from "@/lib/utils";

interface PortfolioProjectProps {
  title: string;
  subtitle?: string;
  heroImage?: string;
  overview: string;
  challenge?: string;
  solution?: string;
  results?: { label: string; value: string }[];
  techStack: string[];
  gallery?: { src: string; alt: string }[];
  liveUrl?: string;
  githubUrl?: string;
  date?: string;
  tags?: string[];
  className?: string;
}

export function PortfolioProject({
  title,
  subtitle,
  heroImage,
  overview,
  challenge,
  solution,
  results,
  techStack,
  gallery,
  liveUrl,
  githubUrl,
  date,
  tags,
  className,
}: PortfolioProjectProps) {
  return (
    <PageTransition>
      <div className={cn("min-h-screen bg-vectosilo-bg", className)}>
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.a
            href="#"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-vectosilo-muted transition-colors hover:text-vectosilo-text"
          >
            <ArrowLeft size={14} /> Back to projects
          </motion.a>

          {heroImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative mb-10 overflow-hidden rounded-2xl"
            >
              <img
                src={heroImage}
                alt={title}
                className="w-full object-cover"
                style={{ maxHeight: "480px" }}
              />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                {tags && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-vectosilo-accent/10 px-2.5 py-0.5 text-xs font-medium text-vectosilo-accent"
                      >
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                  </div>
                )}
                <h1 className="text-3xl font-bold text-vectosilo-text sm:text-4xl lg:text-5xl">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 text-lg text-vectosilo-muted">{subtitle}</p>
                )}
              </div>
              <div className="mt-4 flex gap-3 sm:mt-0">
                {liveUrl && (
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-vectosilo-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-vectosilo-accent/90"
                  >
                    <ExternalLink size={14} /> Live Site
                  </a>
                )}
                {githubUrl && (
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-vectosilo-border px-4 py-2 text-sm font-semibold text-vectosilo-text transition-colors hover:bg-vectosilo-surface"
                  >
                    <Github size={14} /> Source
                  </a>
                )}
              </div>
            </div>

            {date && (
              <div className="mt-4 flex items-center gap-1.5 text-sm text-vectosilo-muted">
                <Calendar size={14} /> {date}
              </div>
            )}
          </motion.div>

          <div className="mt-12 grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-10">
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-xl font-semibold text-vectosilo-text">Overview</h2>
                <p className="mt-3 text-sm text-vectosilo-muted leading-relaxed">{overview}</p>
              </motion.section>

              {challenge && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-xl font-semibold text-vectosilo-text">The Challenge</h2>
                  <p className="mt-3 text-sm text-vectosilo-muted leading-relaxed">{challenge}</p>
                </motion.section>
              )}

              {solution && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-xl font-semibold text-vectosilo-text">The Solution</h2>
                  <p className="mt-3 text-sm text-vectosilo-muted leading-relaxed">{solution}</p>
                </motion.section>
              )}

              {gallery && gallery.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                >
                  <h2 className="text-xl font-semibold text-vectosilo-text">Gallery</h2>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {gallery.map((img, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="overflow-hidden rounded-xl"
                      >
                        <img
                          src={img.src}
                          alt={img.alt}
                          className="h-48 w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}
            </div>

            <div className="space-y-8">
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="rounded-xl border border-vectosilo-border bg-vectosilo-surface p-5"
                >
                  <h3 className="text-sm font-semibold text-vectosilo-text">Results</h3>
                  <div className="mt-4 space-y-4">
                    {results.map((r) => (
                      <div key={r.label}>
                        <p className="text-2xl font-bold text-vectosilo-accent">{r.value}</p>
                        <p className="text-xs text-vectosilo-muted">{r.label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="rounded-xl border border-vectosilo-border bg-vectosilo-surface p-5"
              >
                <h3 className="text-sm font-semibold text-vectosilo-text">Tech Stack</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg bg-vectosilo-surface-2 px-2.5 py-1 text-xs font-medium text-vectosilo-muted"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
