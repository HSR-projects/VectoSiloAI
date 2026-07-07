import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Lightweight per-user API usage log, backed by a JSON file per user (mirrors
 * lib/threadsStorage). Each request appends a timestamped event; the dashboard
 * aggregates these into totals + a bucketed series for the selected time range.
 */

const USAGE_DIR = path.join(process.cwd(), "data", "usage");

export interface UsageEvent {
  ts: number;
  promptTokens: number;
  completionTokens: number;
  costCents: number;
}

export type UsageRange = "24h" | "7d" | "30d" | "90d";

const RANGE_MS: Record<UsageRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

function filePath(userId: string) {
  return path.join(USAGE_DIR, `${userId}.json`);
}

async function read(userId: string): Promise<UsageEvent[]> {
  try {
    const raw = await fs.readFile(filePath(userId), "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function write(userId: string, events: UsageEvent[]): Promise<void> {
  await fs.mkdir(USAGE_DIR, { recursive: true });
  await fs.writeFile(filePath(userId), JSON.stringify(events));
}

/** Record one billed API request. Retention is bounded to ~95 days / 10k events. */
export async function recordUsage(
  userId: string,
  e: { promptTokens: number; completionTokens: number; costCents: number },
): Promise<void> {
  try {
    const events = await read(userId);
    events.push({ ts: Date.now(), ...e });
    const cutoff = Date.now() - 95 * 24 * 60 * 60 * 1000;
    const trimmed = events.filter((x) => x.ts >= cutoff).slice(-10000);
    await write(userId, trimmed);
  } catch {
    // Usage logging must never break a billed request.
  }
}

export interface UsageSummary {
  range: UsageRange;
  totalTokens: number;
  totalRequests: number;
  totalCostCents: number;
  series: { t: number; tokens: number; requests: number }[];
}

export async function getUsage(userId: string, range: UsageRange): Promise<UsageSummary> {
  const events = await read(userId);
  const now = Date.now();
  const span = RANGE_MS[range] ?? RANGE_MS["24h"];
  const from = now - span;
  const inWindow = events.filter((e) => e.ts >= from);

  const buckets = 24;
  const size = span / buckets;
  const series = Array.from({ length: buckets }, (_, i) => ({
    t: Math.round(from + i * size),
    tokens: 0,
    requests: 0,
  }));

  let totalTokens = 0;
  let totalRequests = 0;
  let totalCostCents = 0;
  for (const e of inWindow) {
    const tokens = e.promptTokens + e.completionTokens;
    totalTokens += tokens;
    totalRequests += 1;
    totalCostCents += e.costCents;
    const idx = Math.min(buckets - 1, Math.max(0, Math.floor((e.ts - from) / size)));
    series[idx].tokens += tokens;
    series[idx].requests += 1;
  }

  return { range, totalTokens, totalRequests, totalCostCents, series };
}
