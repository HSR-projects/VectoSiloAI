/**
 * In-memory rate limiter — module-level, persists for the Node.js process lifetime.
 * Keyed by any string (IP, email, IP+action, etc.).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Prune stale entries once every 10 minutes to avoid unbounded memory growth.
let pruneScheduled = false;
function schedulePrune() {
  if (pruneScheduled) return;
  pruneScheduled = true;
  setTimeout(() => {
    const now = Date.now();
    for (const [k, v] of store) if (now > v.resetAt) store.delete(k);
    pruneScheduled = false;
  }, 10 * 60 * 1000);
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (only set when ok === false). */
  retryAfterSecs?: number;
}

/**
 * Check and increment a rate-limit bucket.
 * @param key       Unique key (e.g. `register:1.2.3.4`)
 * @param limit     Maximum requests allowed in the window
 * @param windowMs  Window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  schedulePrune();
  const now = Date.now();
  let bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }

  bucket.count++;

  if (bucket.count > limit) {
    return { ok: false, retryAfterSecs: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { ok: true };
}

/** Extract the best-effort client IP from a Next.js Request. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
