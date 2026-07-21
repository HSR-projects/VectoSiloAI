// @ts-nocheck
// Template ID: page-docs
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  Copy,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { PageTransition } from "../components/PageTransition";

type DocSection = {
  id: string;
  title: string;
  content: {
    type: "heading" | "paragraph" | "code" | "note";
    text: string;
    language?: string;
  }[];
};

type DocCategory = {
  title: string;
  items: { id: string; title: string }[];
};

const sidebar: DocCategory[] = [
  {
    title: "Getting Started",
    items: [
      { id: "introduction", title: "Introduction" },
      { id: "quickstart", title: "Quickstart Guide" },
      { id: "installation", title: "Installation" },
    ],
  },
  {
    title: "Installation",
    items: [
      { id: "system-requirements", title: "System Requirements" },
      { id: "npm-setup", title: "npm Setup" },
      { id: "docker-setup", title: "Docker Setup" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { id: "configuration-overview", title: "Overview" },
      { id: "environment-variables", title: "Environment Variables" },
      { id: "database-config", title: "Database Configuration" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { id: "authentication", title: "Authentication" },
      { id: "endpoints", title: "Endpoints" },
      { id: "rate-limiting", title: "Rate Limiting" },
      { id: "errors", title: "Errors" },
    ],
  },
  {
    title: "Examples",
    items: [
      { id: "basic-usage", title: "Basic Usage" },
      { id: "advanced-patterns", title: "Advanced Patterns" },
      { id: "webhooks", title: "Webhooks" },
    ],
  },
  {
    title: "FAQ",
    items: [
      { id: "common-questions", title: "Common Questions" },
      { id: "troubleshooting", title: "Troubleshooting" },
    ],
  },
];

const docContent: Record<string, DocSection> = {
  introduction: {
    id: "introduction",
    title: "Introduction",
    content: [
      {
        type: "paragraph",
        text: "Welcome to the VectoSiloAI documentation. This guide will help you get started with our platform and make the most of its features. VectoSiloAI is a powerful toolkit designed to streamline your workflow and boost productivity.",
      },
      {
        type: "heading",
        text: "What is VectoSiloAI?",
      },
      {
        type: "paragraph",
        text: "VectoSiloAI is an all-in-one platform that provides tools for building, deploying, and scaling modern applications. With a focus on developer experience and performance, VectoSiloAI helps teams ship faster and with confidence.",
      },
      {
        type: "note",
        text: "VectoSiloAI is currently in public beta. Some features may change as we continue to improve the platform.",
      },
      {
        type: "heading",
        text: "Key Features",
      },
      {
        type: "paragraph",
        text: "Our platform includes real-time collaboration, edge deployment, built-in analytics, team management, comprehensive API, and enterprise-grade security with SOC 2 compliance.",
      },
    ],
  },
  quickstart: {
    id: "quickstart",
    title: "Quickstart Guide",
    content: [
      {
        type: "paragraph",
        text: "Get up and running with VectoSiloAI in under 5 minutes. Follow these steps to create your first project and make your first API call.",
      },
      {
        type: "heading",
        text: "Step 1: Create an Account",
      },
      {
        type: "paragraph",
        text: "Visit the VectoSiloAI dashboard and sign up for a free account. No credit card is required for the trial period.",
      },
      {
        type: "heading",
        text: "Step 2: Install the CLI",
      },
      {
        type: "code",
        text: "npm install -g @vectosiloai/cli\n\nvectosiloai login\nvectosiloai init my-project",
        language: "bash",
      },
      {
        type: "heading",
        text: "Step 3: Make Your First API Call",
      },
      {
        type: "code",
        text: "import { VectoSiloAI } from '@vectosiloai/sdk';\n\nconst client = new VectoSiloAI({\n  apiKey: process.env.VECTOSILOI_API_KEY,\n});\n\nconst response = await client.query({\n  model: 'gpt-4',\n  messages: [{ role: 'user', content: 'Hello!' }],\n});\n\nconsole.log(response.data);",
        language: "typescript",
      },
    ],
  },
  installation: {
    id: "installation",
    title: "Installation",
    content: [
      {
        type: "paragraph",
        text: "Choose your preferred installation method. VectoSiloAI supports npm, yarn, pnpm, and Docker installations.",
      },
      {
        type: "heading",
        text: "npm",
      },
      {
        type: "code",
        text: "npm install @vectosiloai/sdk @vectosiloai/cli",
        language: "bash",
      },
      {
        type: "heading",
        text: "Yarn",
      },
      {
        type: "code",
        text: "yarn add @vectosiloai/sdk @vectosiloai/cli",
        language: "bash",
      },
      {
        type: "heading",
        text: "Docker",
      },
      {
        type: "code",
        text: "docker pull vectosiloai/platform:latest\ndocker run -d -p 3000:3000 \\\n  -e VECTOSILOI_API_KEY=your_key \\\n  vectosiloai/platform:latest",
        language: "bash",
      },
    ],
  },
  "system-requirements": {
    id: "system-requirements",
    title: "System Requirements",
    content: [
      { type: "paragraph", text: "Before installing VectoSiloAI, ensure your system meets the following requirements." },
      { type: "heading", text: "Minimum Requirements" },
      { type: "paragraph", text: "Node.js 18.0 or higher, 4 GB RAM, 2 CPU cores, 10 GB free disk space. macOS 12+, Ubuntu 20.04+, or Windows 10+ with WSL2." },
      { type: "heading", text: "Recommended Requirements" },
      { type: "paragraph", text: "Node.js 20.0 or higher, 8 GB RAM, 4 CPU cores, 50 GB SSD. A modern browser like Chrome, Firefox, or Safari." },
    ],
  },
  "npm-setup": {
    id: "npm-setup",
    title: "npm Setup",
    content: [
      { type: "paragraph", text: "Configure npm for optimal VectoSiloAI performance and compatibility." },
      { type: "heading", text: "Configuration" },
      { type: "code", text: "npm config set registry https://registry.npmjs.org/\nnpm install -g @vectosiloai/cli", language: "bash" },
    ],
  },
  "docker-setup": {
    id: "docker-setup",
    title: "Docker Setup",
    content: [
      { type: "paragraph", text: "Deploy VectoSiloAI using Docker for containerized environments." },
      { type: "heading", text: "Docker Compose" },
      { type: "code", text: "version: '3.8'\nservices:\n  vectosiloai:\n    image: vectosiloai/platform:latest\n    ports:\n      - '3000:3000'\n    environment:\n      - VECTOSILOI_API_KEY=${VECTOSILOI_API_KEY}\n    volumes:\n      - ./data:/app/data", language: "yaml" },
    ],
  },
  "configuration-overview": {
    id: "configuration-overview",
    title: "Configuration Overview",
    content: [
      { type: "paragraph", text: "Learn how to configure VectoSiloAI to match your specific needs and environment." },
      { type: "heading", text: "Configuration File" },
      { type: "code", text: "// vectosiloai.config.ts\nexport default {\n  api: {\n    baseUrl: 'https://api.vectosiloai.dev',\n    timeout: 30000,\n    retries: 3,\n  },\n  cache: {\n    ttl: 3600,\n    provider: 'redis',\n  },\n  logging: {\n    level: 'info',\n    format: 'json',\n  },\n};", language: "typescript" },
    ],
  },
  "environment-variables": {
    id: "environment-variables",
    title: "Environment Variables",
    content: [
      { type: "paragraph", text: "Configure VectoSiloAI behavior through environment variables for different deployment environments." },
      { type: "heading", text: "Available Variables" },
      { type: "code", text: "VECTOSILOI_API_KEY=sk-...\nVECTOSILOI_API_URL=https://api.vectosiloai.dev\nVECTOSILOI_LOG_LEVEL=debug\nVECTOSILOI_CACHE_TTL=3600\nVECTOSILOI_MAX_RETRIES=3", language: "bash" },
    ],
  },
  "database-config": {
    id: "database-config",
    title: "Database Configuration",
    content: [
      { type: "paragraph", text: "Configure database connections for VectoSiloAI." },
      { type: "heading", text: "PostgreSQL" },
      { type: "code", text: "DATABASE_URL=postgresql://user:password@localhost:5432/vectosiloai\nDATABASE_POOL_MIN=2\nDATABASE_POOL_MAX=10", language: "bash" },
    ],
  },
  authentication: {
    id: "authentication",
    title: "Authentication",
    content: [
      { type: "paragraph", text: "VectoSiloAI uses API keys for authentication. All API requests must include a valid API key in the Authorization header." },
      { type: "heading", text: "API Keys" },
      { type: "code", text: "curl -H 'Authorization: Bearer sk-...' \\\n  https://api.vectosiloai.dev/v1/query", language: "bash" },
      { type: "heading", text: "Rate Limits" },
      { type: "paragraph", text: "Free tier: 100 requests/hour. Pro tier: 10,000 requests/hour. Enterprise: Custom limits." },
    ],
  },
  endpoints: {
    id: "endpoints",
    title: "Endpoints",
    content: [
      { type: "paragraph", text: "Comprehensive list of available API endpoints." },
      { type: "heading", text: "Query Endpoint" },
      { type: "code", text: "POST /v1/query\nContent-Type: application/json\n\n{\n  \"model\": \"gpt-4\",\n  \"messages\": [{ \"role\": \"user\", \"content\": \"Hello\" }]\n}", language: "json" },
      { type: "heading", text: "Models Endpoint" },
      { type: "code", text: "GET /v1/models\n\nResponse: {\n  \"data\": [\n    { \"id\": \"gpt-4\", \"created\": 1686935002 },\n    { \"id\": \"gpt-3.5-turbo\", \"created\": 1677610602 }\n  ]\n}", language: "json" },
    ],
  },
  "rate-limiting": {
    id: "rate-limiting",
    title: "Rate Limiting",
    content: [
      { type: "paragraph", text: "VectoSiloAI implements rate limiting to ensure fair usage and platform stability." },
      { type: "heading", text: "Headers" },
      { type: "code", text: "X-RateLimit-Limit: 100\nX-RateLimit-Remaining: 95\nX-RateLimit-Reset: 1620000000", language: "text" },
      { type: "note", text: "When you exceed the rate limit, the API returns a 429 Too Many Requests status code." },
    ],
  },
  errors: {
    id: "errors",
    title: "Errors",
    content: [
      { type: "paragraph", text: "VectoSiloAI uses conventional HTTP response codes to indicate success or failure." },
      { type: "heading", text: "Error Codes" },
      { type: "code", text: "400 Bad Request - Invalid parameters\n401 Unauthorized - Missing or invalid API key\n429 Too Many Requests - Rate limit exceeded\n500 Internal Server Error - Server error", language: "text" },
    ],
  },
  "basic-usage": {
    id: "basic-usage",
    title: "Basic Usage",
    content: [
      { type: "paragraph", text: "Learn the basics of using VectoSiloAI with simple examples." },
      { type: "heading", text: "Simple Query" },
      { type: "code", text: "import { VectoSiloAI } from '@vectosiloai/sdk';\n\nconst ai = new VectoSiloAI({ apiKey: 'sk-...' });\n\nconst result = await ai.query({\n  model: 'gpt-4',\n  messages: [\n    { role: 'system', content: 'You are a helpful assistant.' },\n    { role: 'user', content: 'What is the capital of France?' },\n  ],\n});\n\nconsole.log(result.choices[0].message.content);", language: "typescript" },
    ],
  },
  "advanced-patterns": {
    id: "advanced-patterns",
    title: "Advanced Patterns",
    content: [
      { type: "paragraph", text: "Explore advanced usage patterns for complex scenarios." },
      { type: "heading", text: "Streaming" },
      { type: "code", text: "const stream = await ai.queryStream({\n  model: 'gpt-4',\n  messages: [{ role: 'user', content: 'Tell me a story' }],\n});\n\nfor await (const chunk of stream) {\n  process.stdout.write(chunk.choices[0]?.delta?.content || '');\n}", language: "typescript" },
    ],
  },
  webhooks: {
    id: "webhooks",
    title: "Webhooks",
    content: [
      { type: "paragraph", text: "Use webhooks to receive real-time notifications about events in your account." },
      { type: "heading", text: "Webhook Events" },
      { type: "code", text: "// Webhook payload example\n{\n  \"event\": \"query.completed\",\n  \"data\": {\n    \"id\": \"qry_123\",\n    \"status\": \"completed\",\n    \"tokens_used\": 150\n  },\n  \"created_at\": \"2026-06-15T12:00:00Z\"\n}", language: "json" },
    ],
  },
  "common-questions": {
    id: "common-questions",
    title: "Common Questions",
    content: [
      { type: "paragraph", text: "Find answers to the most frequently asked questions about VectoSiloAI." },
      { type: "heading", text: "Is VectoSiloAI free to use?" },
      { type: "paragraph", text: "Yes, VectoSiloAI offers a free tier with limited usage. For higher limits, check our paid plans." },
      { type: "heading", text: "Can I self-host VectoSiloAI?" },
      { type: "paragraph", text: "Yes, enterprise customers can self-host VectoSiloAI using our Docker images." },
    ],
  },
  troubleshooting: {
    id: "troubleshooting",
    title: "Troubleshooting",
    content: [
      { type: "paragraph", text: "Common issues and their solutions." },
      { type: "heading", text: "Connection Issues" },
      { type: "paragraph", text: "If you are experiencing connection issues, verify your API key is correct and your network allows outbound connections to api.vectosiloai.dev on port 443." },
      { type: "heading", text: "Rate Limiting" },
      { type: "paragraph", text: "If you receive 429 errors, implement exponential backoff in your application or upgrade to a higher tier plan." },
    ],
  },
};

export default function Docs() {
  const [activeDoc, setActiveDoc] = useState("introduction");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const current = docContent[activeDoc];
  const allIds = Object.keys(docContent);
  const idx = allIds.indexOf(activeDoc);
  const prev = idx > 0 ? docContent[allIds[idx - 1]] : null;
  const next = idx < allIds.length - 1 ? docContent[allIds[idx + 1]] : null;

  const sidebarNav = (
    <nav className="space-y-6">
      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search docs..."
          className="w-full rounded-lg border border-[#424242] bg-[#2f2f2f] py-2.5 pl-9 pr-3 text-sm text-[#ececec] placeholder:text-[#8e8e93] outline-none transition-colors focus:border-[#10a37f]"
        />
      </div>
      {sidebar.map((cat) => {
        const filtered = cat.items.filter(
          (item) =>
            !search ||
            item.title.toLowerCase().includes(search.toLowerCase())
        );
        if (filtered.length === 0 && search) return null;
        return (
          <div key={cat.title}>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8e8e93]">
              {cat.title}
            </h4>
            <ul className="space-y-0.5">
              {filtered.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      setActiveDoc(item.id);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                      activeDoc === item.id
                        ? "bg-[#10a37f]/10 text-[#10a37f] font-medium"
                        : "text-[#8e8e93] hover:bg-[#2f2f2f] hover:text-[#ececec]"
                    )}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto flex max-w-7xl">
          <aside className="hidden w-64 shrink-0 border-r border-[#424242] p-6 lg:block">
            <div className="sticky top-0 max-h-screen overflow-y-auto">
              {sidebarNav}
            </div>
          </aside>

          <main className="min-w-0 flex-1 px-4 py-12 sm:px-6 lg:px-12">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mb-4 flex items-center gap-2 rounded-lg border border-[#424242] px-3 py-2 text-sm text-[#8e8e93] transition-colors hover:border-[#10a37f] hover:text-[#10a37f] lg:hidden"
            >
              <Menu size={16} />
              Menu
            </button>

            {sidebarOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-[#424242] bg-[#212121] p-6 lg:hidden"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#ececec]">
                      Documentation
                    </span>
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="rounded-lg p-1.5 text-[#8e8e93] hover:bg-[#2f2f2f] hover:text-[#ececec]"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {sidebarNav}
                </motion.aside>
              </>
            )}

            <Breadcrumbs
              items={[
                { label: "Docs", href: "/docs" },
                { label: current?.title ?? "" },
              ]}
            />

            {current && (
              <article className="mt-8">
                <h1 className="text-3xl font-bold text-[#ececec]">
                  {current.title}
                </h1>
                <div className="mt-6 space-y-6">
                  {current.content.map((block, i) => {
                    if (block.type === "heading") {
                      return (
                        <h2
                          key={i}
                          className="mt-8 text-xl font-semibold text-[#ececec] first:mt-0"
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
                    if (block.type === "code") {
                      const codeKey = `${i}`;
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
                                setCopied(codeKey);
                                setTimeout(() => setCopied(null), 2000);
                              }}
                              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[#8e8e93] transition-colors hover:bg-[#2f2f2f] hover:text-[#10a37f]"
                            >
                              {copied === codeKey ? (
                                <>
                                  <Check size={12} /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={12} /> Copy
                                </>
                              )}
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
                    if (block.type === "note") {
                      return (
                        <div
                          key={i}
                          className="rounded-xl border border-[#10a37f]/30 bg-[#10a37f]/5 p-4 text-sm text-[#ececec]"
                        >
                          <span className="font-semibold text-[#10a37f]">
                            Note:
                          </span>{" "}
                          {block.text}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </article>
            )}

            <div className="mt-16 flex items-center justify-between border-t border-[#424242] pt-8">
              {prev ? (
                <button
                  onClick={() => setActiveDoc(prev.id)}
                  className="group flex items-center gap-2 text-sm text-[#8e8e93] transition-colors hover:text-[#10a37f]"
                >
                  <ChevronLeft
                    size={16}
                    className="transition-transform group-hover:-translate-x-1"
                  />
                  <div className="text-left">
                    <span className="text-xs text-[#8e8e93]">Previous</span>
                    <p className="font-medium text-[#ececec]">{prev.title}</p>
                  </div>
                </button>
              ) : (
                <div />
              )}
              {next && (
                <button
                  onClick={() => setActiveDoc(next.id)}
                  className="group flex items-center gap-2 text-right text-sm text-[#8e8e93] transition-colors hover:text-[#10a37f]"
                >
                  <div className="text-right">
                    <span className="text-xs text-[#8e8e93]">Next</span>
                    <p className="font-medium text-[#ececec]">{next.title}</p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </button>
              )}
            </div>
          </main>
        </div>
      </div>
    </PageTransition>
  );
}
