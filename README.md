# 🔮 KodaAI

A privacy-first, Perplexity-style AI search & chat app — powered by **KodaAI Private Cloud**.
No OpenAI, no Anthropic, no telemetry. Search-augmented, cited answers with a
polished dark UI.

> **This build uses the KodaAI Private Cloud — a fully managed inference stack.**
> You bring your own API key; inference runs on KodaAI's infrastructure.

![stack](https://img.shields.io/badge/Next.js-14-black) ![stack](https://img.shields.io/badge/TypeScript-5-blue) ![stack](https://img.shields.io/badge/KodaAI-Private_Cloud-9b7cff)

---

## Features

- **Search-augmented chat (agentic RAG)** — SearXNG web search → scrape → grounded, cited answer
- **Token-by-token streaming** with an animated cursor
- **Inline citations** `[1]` `[2]` linked to source cards
- **Auto follow-up questions** after every answer
- **Thread history** persisted in `localStorage`
- **Model switcher** — lists your KodaAI Private Cloud models
- **Focus modes** — All · No Search · Code · Academic
- **Privacy dashboard** — shows the active model and a 0 third-party-AI-calls counter
- **Mobile responsive**, keyboard-navigable, accessible

---

## Quick start

### 1. Get a KodaAI API key

Sign in to your KodaAI dashboard and generate an API key under **Settings → API Keys**.

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
KODA_CLOUD_BASE_URL=https://cloud.kodaai.com
KODA_CLOUD_API_KEY=sk-...your-key...
KODA_DEFAULT_MODEL=koda-1
SEARXNG_BASE_URL=http://localhost:8080
```

### 3. Install & run

```bash
npm install
npm run dev
```

Open **http://localhost:3000**.

> Using `pnpm`? `pnpm install && pnpm dev` works identically.

---

## Web search (for "All" / "Academic" modes)

Web search runs through the **KodaAI Private Cloud Search API**, authenticated with
the same `KODA_CLOUD_API_KEY` — **no separate search key or server required.** Results
already include page content, so no scraping step is needed. If search fails for
any reason, KodaAI degrades to "No Search" mode with a banner.

Backend priority: **KodaAI Private Cloud Search → SearXNG → Brave**.

**SearXNG fallback (only needed for local-only setups that have no web search):**

```bash
docker run -d --name searxng -p 8080:8080 \
  -v searxng-data:/etc/searxng searxng/searxng:latest
```

> SearXNG must return JSON — enable `formats: [html, json]` in its `settings.yml`.

**Brave fallback (optional):** set `BRAVE_SEARCH_API_KEY` in `.env`.

---

## Want to run fully local instead of cloud?

KodaAI can also be pointed at a local inference server:

```env
KODA_CLOUD_BASE_URL=http://localhost:11434
KODA_CLOUD_API_KEY=
KODA_DEFAULT_MODEL=llama3.2
```

---

## Architecture

```
User query
  └─ /api/search  → KodaAI Private Cloud search (top 5 + page content)
       └─ /api/scrape → cheerio fallback, only for results lacking content
             └─ /api/chat → KodaAI Private Cloud inference (streamed SSE)
                 └─ follow-up questions (second, non-streaming call)
```

| Path | Purpose |
|---|---|
| `app/api/chat` | Streaming chat (SSE) + follow-up generation |
| `app/api/search` | KodaAI Private Cloud web search (SearXNG / Brave fallback) |
| `app/api/scrape` | URL → readable text (fallback only) |
| `app/api/cloud/models` | Lists available KodaAI models |
| `lib/cloud.ts` | Cloud client (bearer auth, streaming) |
| `lib/store.ts` | Zustand state (threads, model, focus mode) |
| `hooks/useChat.ts` | Orchestrates search → scrape → stream |

---

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS v3 · Radix UI primitives ·
Framer Motion · Zustand · react-markdown + remark-gfm + rehype-highlight ·
Lucide icons · KodaAI Own Private Models.

---

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # serve production build
npm run lint    # eslint
```

---

## Privacy notes

- Inference runs on **KodaAI's own private models** — not on OpenAI/Anthropic.
- Web search (when enabled) goes to **your** SearXNG instance.
- Threads live in your browser's `localStorage`; nothing is uploaded by KodaAI.
- The privacy badge tracks third-party AI calls (always `0` by design).

---

Built as a privacy-respecting alternative to hosted AI search. 🔒
