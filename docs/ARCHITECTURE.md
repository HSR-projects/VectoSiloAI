# VectoSiloAI — Architecture & Design

## Overview

VectoSiloAI is a privacy-first AI search and chat application. All inference runs on **VectoSiloAI's own private models** — no data is sent to OpenAI, Anthropic, or any third-party AI provider.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 + Radix UI primitives |
| State | Zustand (client-side store) |
| Streaming | Server-Sent Events (SSE) |
| Auth | Google OAuth + email OTP |
| Payments | Razorpay (subscriptions + gift purchases) |
| Persistence | JSON files in `data/` (auth, orgs, gifts, shares) + localStorage (threads) |

## How it was made

### Design principles

1. **Privacy by default** — zero telemetry, no third-party AI calls. Users bring their own API key to VectoSiloAI's private cloud.
2. **Streaming-first** — every chat response streams token-by-token via SSE with an animated cursor for real-time feedback.
3. **Search-augmented RAG** — queries go through web search → page scraping → grounded answer with inline citations `[1]` `[2]`.
4. **Mobile-first responsive** — all pages adapt from 320px phones to widescreen desktops with proper touch targets (40px+).

### Request flow

```
User types query
  → /api/search (VectoSiloAI Private Cloud search → top 5 results with page content)
  → /api/scrape (cheerio fallback if search results lack content)
  → /api/chat (VectoSiloAI Private Cloud inference via streamed SSE)
  → follow-up questions (second non-streaming call)
```

### Key features built

| Feature | What it does |
|---|---|
| Agentic RAG | Web search + scrape → cited answer with sources |
| Thread management | Conversation history in localStorage |
| Model switching | Choose from available VectoSiloAI models |
| Focus modes | All / No Search / Code / Academic |
| Privacy dashboard | Live counter: 0 third-party AI calls |
| Ultra plan ($1000/mo) | Team orgs, 99 agent steps, 8 swarm agents |
| Org management | Request/approve members, admin controls, disable/remove |
| Gift subscriptions | Purchase via Razorpay → share gift code |
| Shareable links | Public read-only conversation URLs |

### Data model

```
User ── has threads (localStorage)
  ├── has plan (free / go / pro / max / ultra)
  ├── belongs to org (ultra only)
  └── has gifts sent/redeemed

Org ── has members (admin + members)
  ├── has requests (pending / approved / rejected)
  └── is owned by one user

Thread ── has messages (user + assistant)
  ├── has shareId (optional, for public links)
  └── is owned by one user

Gift ── has code (VECTOSILO-XXXXXXXX)
  ├── has plan (pro / max)
  └── has sender + optional recipient
```

### Infrastructure

- **Inference**: VectoSiloAI Private Cloud — fully managed model infrastructure
- **Search**: VectoSiloAI Private Cloud Search API (primary), SearXNG (fallback), Brave (optional)
- **Auth**: Google OAuth + magic-link email OTP
- **Payments**: Razorpay for subscriptions, upgrades, and gift purchases
- **Storage**: JSON files on disk (auth, orgs, gifts, shares) + browser localStorage (threads)

### Directory layout

```
app/
  api/          — All backend routes (chat, search, auth, payments, orgs, gifts, shares)
  pricing/      — Full-screen pricing page (Consumers / Enterprise tabs)
  share/        — Public read-only shared conversations
  gift/         — Gift code redemption page
components/
  auth/         — AuthGate, AccountMenu, AuthProvider
  billing/      — OrgPanel, GiftModal, JoinOrgModal, ShareButton, PricingModal (stub)
  layout/       — Sidebar, Header, SettingsModal, ModelSwitcher
  search/       — SearchBar, FocusModes, AnswerPanel
lib/
  cloud.ts      — VectoSiloAI Private Cloud client (bearer auth, streaming)
  auth.ts       — Authentication, user management, persistence
  store.ts      — Zustand store (threads, model, focus mode, UI state)
  plans.ts      — Plan definitions (Free / Go / Pro / Max / Ultra)
  razorpay.ts   — Razorpay integration
  orgs.ts       — Org CRUD, request/review, member management
  gifts.ts      — Gift creation, redemption, lookup
  shares.ts     — Share link create/revoke/get
```
