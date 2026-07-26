// @ts-nocheck
// Template ID: page-blog-post
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Twitter,
  Linkedin,
  Facebook,
  Link,
  Check,
  Clock,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../components/Badge";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { CardBlog } from "../components/CardBlog";
import { Newsletter } from "../components/Newsletter";
import { PageTransition } from "../components/PageTransition";

const placeholderImg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23343441' width='800' height='600'/%3E%3C/svg%3E";

const relatedPosts = [
  {
    image: placeholderImg,
    date: "Jun 12, 2026",
    category: "Engineering",
    title: "How We Scaled to 1 Million Requests Per Second",
    excerpt: "A deep dive into our architecture decisions and the challenges we faced.",
    author: { name: "Marcus Johnson", avatar: placeholderImg },
    slug: "/blog/scaling-to-1m-rps",
  },
  {
    image: placeholderImg,
    date: "Jun 10, 2026",
    category: "Design",
    title: "Designing for Accessibility: Our Principles",
    excerpt: "Why accessibility matters in every product decision.",
    author: { name: "Aisha Patel", avatar: placeholderImg },
    slug: "/blog/designing-for-accessibility",
  },
  {
    image: placeholderImg,
    date: "Jun 8, 2026",
    category: "Company",
    title: "Announcing Our $50M Series B",
    excerpt: "We are thrilled to announce our Series B funding round.",
    author: { name: "David Kim", avatar: placeholderImg },
    slug: "/blog/series-b-announcement",
  },
];

const tocItems = [
  { id: "introduction", label: "Introduction" },
  { id: "the-challenge", label: "The Challenge" },
  { id: "our-approach", label: "Our Approach" },
  { id: "implementation", label: "Implementation" },
  { id: "results", label: "Results" },
  { id: "conclusion", label: "Conclusion" },
];

const articleContent = [
  { type: "heading", text: "Introduction", id: "introduction" },
  {
    type: "paragraph",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  },
  {
    type: "paragraph",
    text: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.",
  },
  { type: "heading", text: "The Challenge", id: "the-challenge" },
  {
    type: "paragraph",
    text: "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.",
  },
  {
    type: "blockquote",
    text: "The biggest challenge was not the technology itself, but rather the coordination across multiple distributed teams working in different time zones.",
  },
  { type: "heading", text: "Our Approach", id: "our-approach" },
  {
    type: "paragraph",
    text: "Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.",
  },
  {
    type: "paragraph",
    text: "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.",
  },
  {
    type: "code",
    text: "function optimizeQuery(query: string): QueryPlan {\n  const parsed = parse(query);\n  const optimized = applyRules(parsed);\n  const cost = estimateCost(optimized);\n  \n  if (cost > THRESHOLD) {\n    return rewriteWithIndex(optimized);\n  }\n  \n  return optimized;\n}",
    language: "typescript",
  },
  { type: "heading", text: "Implementation", id: "implementation" },
  {
    type: "paragraph",
    text: "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit.",
  },
  {
    type: "paragraph",
    text: "Sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam.",
  },
  {
    type: "blockquote",
    text: "We reduced query latency by 87% after implementing the new indexing strategy. The results exceeded our expectations.",
  },
  {
    type: "code",
    text: "// Index configuration\nconst indexConfig = {\n  table: \"users\",\n  columns: [\"email\", \"created_at\"],\n  type: \"btree\",\n  unique: true,\n  concurrent: true,\n};\n\nawait createIndex(indexConfig);",
    language: "typescript",
  },
  { type: "heading", text: "Results", id: "results" },
  {
    type: "paragraph",
    text: "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur. At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.",
  },
  {
    type: "paragraph",
    text: "Voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.",
  },
  { type: "heading", text: "Conclusion", id: "conclusion" },
  {
    type: "paragraph",
    text: "Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus.",
  },
  {
    type: "paragraph",
    text: "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus.",
  },
];

const ShareButton = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Twitter;
  label: string;
  onClick: () => void;
}) => (
  <motion.button
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className="flex items-center gap-2 rounded-lg border border-[#424242] px-3 py-2 text-xs text-[#8e8e93] transition-colors hover:border-[#10a37f] hover:text-[#10a37f]"
    aria-label={label}
  >
    <Icon size={14} />
    <span className="hidden sm:inline">{label}</span>
  </motion.button>
);

export default function BlogPost() {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <motion.a
            href="/blog"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#8e8e93] transition-colors hover:text-[#10a37f]"
          >
            <ArrowLeft size={14} />
            Back to Blog
          </motion.a>

          <Breadcrumbs
            items={[
              { label: "Blog", href: "/blog" },
              { label: "Engineering", href: "/blog?category=Engineering" },
              { label: "How We Scaled to 1M RPS" },
            ]}
          />

          <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_250px]">
            <article>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Badge variant="success" size="sm">
                  Engineering
                </Badge>
                <h1 className="mt-3 text-3xl font-bold text-[#ececec] sm:text-4xl">
                  How We Scaled to 1 Million Requests Per Second
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#8e8e93]">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#10a37f] to-[#343541]" />
                    <span className="font-medium text-[#ececec]">
                      Marcus Johnson
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    Jun 12, 2026
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    8 min read
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-8 flex h-64 items-center justify-center rounded-xl bg-gradient-to-br from-[#10a37f]/20 via-[#343541] to-[#212121] sm:h-80"
              >
                <span className="text-sm text-[#8e8e93]">
                  Featured Image Placeholder
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="prose-custom mt-10 space-y-6"
              >
                {articleContent.map((block, i) => {
                  if (block.type === "heading") {
                    return (
                      <h2
                        key={i}
                        id={block.id}
                        className="scroll-mt-20 text-2xl font-bold text-[#ececec]"
                      >
                        {block.text}
                      </h2>
                    );
                  }
                  if (block.type === "paragraph") {
                    return (
                      <p
                        key={i}
                        className="text-base leading-relaxed text-[#8e8e93]"
                      >
                        {block.text}
                      </p>
                    );
                  }
                  if (block.type === "blockquote") {
                    return (
                      <div
                        key={i}
                        className="border-l-4 border-[#10a37f] bg-[#2f2f2f] py-4 pl-6 italic text-[#ececec]"
                      >
                        <p className="text-base">{block.text}</p>
                      </div>
                    );
                  }
                  if (block.type === "code") {
                    return (
                      <div
                        key={i}
                        className="group relative overflow-hidden rounded-xl border border-[#424242] bg-[#1a1a1a]"
                      >
                        <div className="flex items-center justify-between border-b border-[#424242] px-4 py-2">
                          <span className="text-xs text-[#8e8e93]">
                            {block.language}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(block.text);
                            }}
                            className="rounded px-2 py-1 text-xs text-[#8e8e93] transition-colors hover:bg-[#2f2f2f] hover:text-[#10a37f]"
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="overflow-x-auto p-4">
                          <code className="text-sm text-[#ececec]">
                            {block.text}
                          </code>
                        </pre>
                      </div>
                    );
                  }
                  return null;
                })}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mt-10 flex items-center gap-2 border-t border-[#424242] pt-6"
              >
                <span className="mr-2 text-sm text-[#8e8e93]">Share:</span>
                <ShareButton
                  icon={Twitter}
                  label="Twitter"
                  onClick={() => {}}
                />
                <ShareButton
                  icon={Linkedin}
                  label="LinkedIn"
                  onClick={() => {}}
                />
                <ShareButton
                  icon={Facebook}
                  label="Facebook"
                  onClick={() => {}}
                />
                <ShareButton
                  icon={copied ? Check : Link}
                  label={copied ? "Copied!" : "Copy Link"}
                  onClick={copyLink}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-10 flex items-center gap-4 rounded-xl border border-[#424242] bg-[#2f2f2f] p-6"
              >
                <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-[#10a37f] to-[#343541]" />
                <div>
                  <h3 className="text-base font-semibold text-[#ececec]">
                    Marcus Johnson
                  </h3>
                  <p className="mt-1 text-sm text-[#8e8e93]">
                    Marcus is a senior engineer at IncogniAI, specializing in
                    distributed systems and performance optimization. He has
                    over a decade of experience building scalable infrastructure.
                  </p>
                </div>
              </motion.div>
            </article>

            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#8e8e93]">
                  Table of Contents
                </h4>
                <nav className="space-y-1">
                  {tocItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block rounded px-3 py-1.5 text-sm text-[#8e8e93] transition-colors hover:bg-[#2f2f2f] hover:text-[#10a37f]"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        </div>

        <section className="border-t border-[#424242] px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 text-2xl font-bold text-[#ececec]">
              Related Posts
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((post) => (
                <CardBlog key={post.slug} {...post} />
              ))}
            </div>
          </div>
        </section>

        <Newsletter
          title="Stay in the Loop"
          subtitle="Get the latest posts delivered right to your inbox."
          variant="card"
          buttonText="Subscribe"
        />

        <footer className="border-t border-[#424242] bg-[#2f2f2f] py-12">
          <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[#8e8e93]">
            &copy; {new Date().getFullYear()} IncogniAI. All rights reserved.
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
