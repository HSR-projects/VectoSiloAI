// @ts-nocheck
// Template ID: page-blog-grid
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Navbar } from "../components/Navbar";
import { CardBlog } from "../components/CardBlog";
import { PageTransition } from "../components/PageTransition";

const categories = [
  "All",
  "Product",
  "Engineering",
  "Design",
  "Company",
];

const placeholderImg =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23343441' width='800' height='600'/%3E%3C/svg%3E";

const allPosts = [
  {
    image: placeholderImg,
    date: "Jun 15, 2026",
    category: "Product",
    title: "Introducing Real-Time Collaboration",
    excerpt:
      "Work together with your team in real-time. See changes as they happen, comment inline, and never miss a beat.",
    author: { name: "Sarah Chen", avatar: placeholderImg },
    slug: "/blog/real-time-collaboration",
  },
  {
    image: placeholderImg,
    date: "Jun 12, 2026",
    category: "Engineering",
    title: "How We Scaled to 1 Million Requests Per Second",
    excerpt:
      "A deep dive into our architecture decisions, the challenges we faced, and how we overcame them.",
    author: { name: "Marcus Johnson", avatar: placeholderImg },
    slug: "/blog/scaling-to-1m-rps",
  },
  {
    image: placeholderImg,
    date: "Jun 10, 2026",
    category: "Design",
    title: "Designing for Accessibility: Our Principles",
    excerpt:
      "Why accessibility matters and how we incorporate inclusive design into every product decision.",
    author: { name: "Aisha Patel", avatar: placeholderImg },
    slug: "/blog/designing-for-accessibility",
  },
  {
    image: placeholderImg,
    date: "Jun 8, 2026",
    category: "Company",
    title: "Announcing Our $50M Series B",
    excerpt:
      "We are thrilled to announce our Series B funding round led by Venture Capital Partners.",
    author: { name: "David Kim", avatar: placeholderImg },
    slug: "/blog/series-b-announcement",
  },
  {
    image: placeholderImg,
    date: "Jun 5, 2026",
    category: "Engineering",
    title: "Migrating to a Microservices Architecture",
    excerpt:
      "Lessons learned from breaking up our monolith into manageable, independent services.",
    author: { name: "Emily Zhang", avatar: placeholderImg },
    slug: "/blog/microservices-migration",
  },
  {
    image: placeholderImg,
    date: "Jun 3, 2026",
    category: "Product",
    title: "New Dashboard: Built for Clarity",
    excerpt:
      "Our redesigned dashboard puts the metrics that matter most front and center.",
    author: { name: "Ryan O'Brien", avatar: placeholderImg },
    slug: "/blog/new-dashboard",
  },
  {
    image: placeholderImg,
    date: "May 30, 2026",
    category: "Design",
    title: "The Art of Microinteractions",
    excerpt:
      "How small animations and feedback loops create delightful user experiences.",
    author: { name: "Priya Sharma", avatar: placeholderImg },
    slug: "/blog/microinteractions",
  },
  {
    image: placeholderImg,
    date: "May 28, 2026",
    category: "Company",
    title: "Our Commitment to Open Source",
    excerpt:
      "Why we believe in open source and how we are giving back to the community.",
    author: { name: "Alex Turner", avatar: placeholderImg },
    slug: "/blog/open-source-commitment",
  },
  {
    image: placeholderImg,
    date: "May 25, 2026",
    category: "Engineering",
    title: "Building a Type-Safe API with tRPC",
    excerpt:
      "End-to-end type safety from database to frontend. Here is how we implemented tRPC.",
    author: { name: "Jordan Lee", avatar: placeholderImg },
    slug: "/blog/trpc-type-safe-api",
  },
];

const POSTS_PER_PAGE = 6;

export default function BlogGrid() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = allPosts.filter((post) => {
    const matchesCategory =
      activeCategory === "All" || post.category === activeCategory;
    const matchesSearch =
      !search ||
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE);
  const paginatedPosts = filtered.slice(
    (page - 1) * POSTS_PER_PAGE,
    page * POSTS_PER_PAGE
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#212121]">
        <Navbar
          logo={
            <span className="text-xl font-bold text-[#ececec]">VectoSiloAI</span>
          }
          links={[
            { label: "Home", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: "Pricing", href: "/pricing" },
            { label: "Contact", href: "/contact" },
          ]}
        />

        <div className="mx-auto max-w-7xl px-4 pt-28 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight text-[#ececec] sm:text-5xl">
              Our Blog
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-[#8e8e93]">
              Insights, tutorials, and updates from the VectoSiloAI team.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                    activeCategory === cat
                      ? "bg-[#10a37f] text-white"
                      : "border border-[#424242] text-[#8e8e93] hover:border-[#10a37f] hover:text-[#10a37f]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="relative w-full max-w-xs">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93]"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search posts..."
                className="w-full rounded-lg border border-[#424242] bg-[#2f2f2f] py-2.5 pl-9 pr-3 text-sm text-[#ececec] placeholder:text-[#8e8e93] outline-none transition-colors focus:border-[#10a37f]"
              />
            </div>
          </motion.div>

          <motion.div
            layout
            className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {paginatedPosts.map((post) => (
              <CardBlog key={post.slug} {...post} />
            ))}
          </motion.div>

          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#424242] text-[#8e8e93] transition-colors hover:border-[#10a37f] hover:text-[#10a37f] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-colors",
                    page === i + 1
                      ? "bg-[#10a37f] text-white"
                      : "border border-[#424242] text-[#8e8e93] hover:border-[#10a37f] hover:text-[#10a37f]"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#424242] text-[#8e8e93] transition-colors hover:border-[#10a37f] hover:text-[#10a37f] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <footer className="mt-24 border-t border-[#424242] bg-[#2f2f2f] py-12">
          <div className="mx-auto max-w-6xl px-4 text-center text-sm text-[#8e8e93]">
            &copy; {new Date().getFullYear()} VectoSiloAI. All rights reserved.
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
