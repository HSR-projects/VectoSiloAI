// @ts-nocheck
// Template ID: card-profile
"use client";

import { motion } from "framer-motion";
import { MapPin, Link as LinkIcon, Twitter, Github, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardProfileProps {
  name: string;
  role: string;
  avatar: string;
  coverImage?: string;
  bio?: string;
  location?: string;
  website?: string;
  social?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
  stats?: { label: string; value: string | number }[];
  className?: string;
}

export function CardProfile({
  name,
  role,
  avatar,
  coverImage,
  bio,
  location,
  website,
  social,
  stats,
  className,
}: CardProfileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "overflow-hidden rounded-xl border border-incogni-border bg-incogni-surface",
        className
      )}
    >
      <div className="relative h-28 sm:h-36 overflow-hidden bg-gradient-to-br from-incogni-accent/30 via-purple-500/20 to-incogni-surface-2">
        {coverImage && (
          <img
            src={coverImage}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <div className="relative px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex flex-col items-center -mt-12 sm:-mt-16 sm:flex-row sm:items-end sm:gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-incogni-surface sm:h-24 sm:w-24"
          >
            <img
              src={avatar}
              alt={name}
              className="h-full w-full object-cover"
            />
          </motion.div>
          <div className="mt-2 text-center sm:mt-0 sm:text-left sm:pb-1">
            <h3 className="text-lg font-bold text-incogni-text">{name}</h3>
            <p className="text-sm text-incogni-muted">{role}</p>
          </div>
        </div>

        {bio && (
          <p className="mt-4 text-sm text-incogni-muted leading-relaxed">{bio}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-incogni-muted">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {location}
            </span>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-incogni-accent hover:underline"
            >
              <LinkIcon size={12} /> Website
            </a>
          )}
        </div>

        {social && (
          <div className="mt-4 flex gap-2">
            {social.twitter && (
              <a
                href={social.twitter}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-incogni-surface-2 text-incogni-muted transition-colors hover:bg-incogni-accent/20 hover:text-incogni-accent"
              >
                <Twitter size={14} />
              </a>
            )}
            {social.github && (
              <a
                href={social.github}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-incogni-surface-2 text-incogni-muted transition-colors hover:bg-incogni-accent/20 hover:text-incogni-accent"
              >
                <Github size={14} />
              </a>
            )}
            {social.linkedin && (
              <a
                href={social.linkedin}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-incogni-surface-2 text-incogni-muted transition-colors hover:bg-incogni-accent/20 hover:text-incogni-accent"
              >
                <Linkedin size={14} />
              </a>
            )}
          </div>
        )}

        {stats && (
          <div className="mt-5 grid grid-cols-3 gap-3 rounded-lg bg-incogni-surface-2 p-3">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-sm font-bold text-incogni-text">{s.value}</p>
                <p className="text-[10px] text-incogni-muted">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
