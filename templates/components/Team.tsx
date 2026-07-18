// @ts-nocheck
// Template ID: marketing-team
"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Globe, Github, Twitter, Linkedin, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SocialIconName = "globe" | "github" | "twitter" | "linkedin";

export interface MemberSocial {
  icon: SocialIconName;
  url: string;
}

export interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  bio?: string;
  social?: MemberSocial[];
}

export interface TeamProps {
  title: string;
  subtitle?: string;
  members: TeamMember[];
  className?: string;
}

const socialIconMap: Record<SocialIconName, LucideIcon> = {
  globe: Globe,
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
};

function SocialIcon({ icon }: { icon: SocialIconName }) {
  const Icon = socialIconMap[icon];
  return Icon ? <Icon size={16} /> : null;
}

export function Team({
  title,
  subtitle,
  members,
  className,
}: TeamProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } },
          }}
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {members.map((member, i) => (
            <motion.div
              key={i}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0 },
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="group relative overflow-hidden rounded-xl border border-koda-border bg-koda-surface"
            >
              <div className="aspect-[3/4] overflow-hidden">
                <Image
                  src={member.avatar}
                  alt={member.name}
                  width={300}
                  height={400}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <AnimatePresence>
                {hoveredIndex === i && member.bio && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 flex items-end bg-gradient-to-t from-koda-bg/95 via-koda-bg/60 to-transparent p-4"
                  >
                    <p className="text-xs leading-relaxed text-koda-text/90 line-clamp-4">
                      {member.bio}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ y: 0 }}
                animate={{ y: hoveredIndex === i ? -32 : 0 }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-0 left-0 right-0 p-4"
              >
                <h3 className="text-sm font-semibold text-koda-text">
                  {member.name}
                </h3>
                <p className="text-xs text-koda-muted">{member.role}</p>
              </motion.div>

              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{
                  y: hoveredIndex === i ? 0 : 40,
                  opacity: hoveredIndex === i ? 1 : 0,
                }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 bg-koda-accent py-3"
              >
                {member.social?.map((s, j) => (
                  <a
                    key={j}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/80 transition-colors hover:text-white"
                    aria-label={`${s.icon}`}
                  >
                    <SocialIcon icon={s.icon} />
                  </a>
                ))}
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
