/**
 * Koder coding-agent usage store.
 * Subscription users get KODER_SUBSCRIPTION_LIMIT requests per 5-hour window.
 * API-key users are metered against prepaid credits (handled by the credits system).
 * Backed by a JSON file in data/koder-usage.json.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "koder-usage.json");

/** How many Koder requests a subscription user gets per window. */
export const KODER_SUBSCRIPTION_LIMIT = 80;
/** Window length in ms — 5 hours. */
export const KODER_WINDOW_MS = 5 * 60 * 60 * 1000;

export type KoderAuthType = "subscription" | "apikey";

interface KoderSession {
  /** Opaque bearer token stored as-is (short-lived, random). */
  token: string;
  userId: string;
  authType: KoderAuthType;
  /** For API-key auth, the key whose budget should be charged. */
  apiKeyId?: string;
  createdAt: number;
  /** Only for subscription auth. */
  windowStart?: number;
  used?: number;
}

interface DB {
  sessions: KoderSession[];
}

async function readDB(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const d = JSON.parse(raw);
    return { sessions: Array.isArray(d.sessions) ? d.sessions : [] };
  } catch {
    return { sessions: [] };
  }
}

async function writeDB(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

// ── Session management ────────────────────────────────────────────────────────

/** Create a new Koder session token after successful auth. */
export async function createKoderSession(
  userId: string,
  authType: KoderAuthType,
  apiKeyId?: string
): Promise<string> {
  const db = await readDB();
  // Remove old sessions for this user (one active session per user)
  db.sessions = db.sessions.filter((s) => s.userId !== userId);
  const token = `kd-${randomBytes(24).toString("hex")}`;
  db.sessions.push({
    token,
    userId,
    authType,
    ...(authType === "apikey" && apiKeyId ? { apiKeyId } : {}),
    createdAt: Date.now(),
    ...(authType === "subscription" ? { windowStart: Date.now(), used: 0 } : {}),
  });
  await writeDB(db);
  return token;
}

/** Resolve a Koder bearer token → session, or null if invalid/expired. */
export async function resolveKoderSession(token: string): Promise<KoderSession | null> {
  if (!token) return null;
  const db = await readDB();
  const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
  const session = db.sessions.find(
    (s) => s.token === token && Date.now() - s.createdAt < SESSION_TTL
  );
  return session ?? null;
}

export interface KoderUsageResult {
  allowed: boolean;
  /** For subscription: how many used in this window. */
  used?: number;
  limit?: number;
  /** ms until window resets (only when !allowed). */
  resetIn?: number;
}

/**
 * Check and increment usage for a subscription-auth Koder session.
 * Resets the window automatically after 5 hours.
 */
export async function consumeKoderRequest(token: string): Promise<KoderUsageResult> {
  const db = await readDB();
  const idx = db.sessions.findIndex((s) => s.token === token);
  if (idx === -1) return { allowed: false };

  const session = db.sessions[idx];
  if (session.authType !== "subscription") {
    // API-key sessions are metered by the credits system, always pass here
    return { allowed: true };
  }

  const now = Date.now();
  const windowStart = session.windowStart ?? now;
  const elapsed = now - windowStart;

  // Reset window if 5 hours have passed
  if (elapsed >= KODER_WINDOW_MS) {
    session.windowStart = now;
    session.used = 0;
  }

  const used = session.used ?? 0;
  if (used >= KODER_SUBSCRIPTION_LIMIT) {
    const resetIn = KODER_WINDOW_MS - (now - (session.windowStart ?? now));
    return { allowed: false, used, limit: KODER_SUBSCRIPTION_LIMIT, resetIn };
  }

  session.used = used + 1;
  db.sessions[idx] = session;
  await writeDB(db);
  return { allowed: true, used: session.used, limit: KODER_SUBSCRIPTION_LIMIT };
}

/** Get current usage stats for a session (for CLI display). */
export async function getKoderUsage(token: string): Promise<KoderUsageResult> {
  const db = await readDB();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return { allowed: false };
  if (session.authType !== "subscription") return { allowed: true };

  const now = Date.now();
  const elapsed = now - (session.windowStart ?? now);
  if (elapsed >= KODER_WINDOW_MS) return { allowed: true, used: 0, limit: KODER_SUBSCRIPTION_LIMIT };

  const used = session.used ?? 0;
  const resetIn = KODER_WINDOW_MS - elapsed;
  return {
    allowed: used < KODER_SUBSCRIPTION_LIMIT,
    used,
    limit: KODER_SUBSCRIPTION_LIMIT,
    resetIn,
  };
}
