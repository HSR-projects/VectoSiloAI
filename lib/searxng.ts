import type { ImageResult, SearchResult } from "@/types";
import { searchMCP } from "./search-mcp";
import { execSync } from "child_process";

const SEARXNG_BASE_URL = (
  process.env.SEARXNG_BASE_URL || "http://localhost:6767"
).replace(/\/$/, "");

// Track consecutive failures to trigger container restart
let consecutiveFailures = 0;
let lastRestartAt = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
const MIN_RESTART_INTERVAL_MS = 60_000; // don't restart more than once per minute

export class SearchUnavailableError extends Error {
  constructor(message = "No search backend is available.") {
    super(message);
    this.name = "SearchUnavailableError";
  }
}

/**
 * Restart the SearXNG Docker container to clear engine suspension state.
 * This is safe because the container uses a volume for config.
 */
async function restartSearxngContainer(): Promise<boolean> {
  const now = Date.now();
  if (now - lastRestartAt < MIN_RESTART_INTERVAL_MS) {
    console.log("[searxng] Skipping restart — too soon since last restart");
    return false;
  }
  try {
    console.log("[searxng] Restarting container to clear engine suspensions...");
    execSync("docker restart searxng", { timeout: 10_000 });
    lastRestartAt = Date.now();
    consecutiveFailures = 0;
    // Wait for container to be ready
    await new Promise((r) => setTimeout(r, 3000));
    console.log("[searxng] Container restarted successfully");
    return true;
  } catch (e) {
    console.error("[searxng] Failed to restart container:", (e as Error).message);
    return false;
  }
}

/**
 * Web search with auto-recovery.
 * Backend priority:
 *   1. SearXNG via MCP multi-query parallel (self-hosted Docker, primary)
 *   2. SearXNG direct HTTP fallback
 *   3. Container restart + retry (clears engine rate-limit suspensions)
 * Throws SearchUnavailableError if all attempts fail.
 */
export async function searchWeb(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  const errors: string[] = [];

  // Attempt 1: MCP search
  try {
    const r = await searchSearxngMCP(query, limit);
    if (r.length) {
      consecutiveFailures = 0;
      return r;
    }
  } catch (e) {
    errors.push(`mcp: ${(e as Error).message}`);
  }

  // Attempt 2: Direct HTTP (bypasses MCP)
  try {
    const r = await searchSearxngDirect(query, limit);
    if (r.length) {
      consecutiveFailures = 0;
      return r;
    }
  } catch (e) {
    errors.push(`direct: ${(e as Error).message}`);
  }

  // SearXNG returned no results or failed — track it
  consecutiveFailures++;

  // Attempt 3: If we've had several consecutive failures, restart the container
  // and try once more. This clears engine suspension states in SearXNG.
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    console.log(`[searxng] ${consecutiveFailures} consecutive failures — restarting container...`);
    const restarted = await restartSearxngContainer();
    if (restarted) {
      // Retry after restart
      try {
        const r = await searchSearxngDirect(query, limit);
        if (r.length) {
          consecutiveFailures = 0;
          return r;
        }
      } catch (e) {
        errors.push(`retry: ${(e as Error).message}`);
      }
    }
  }

  throw new SearchUnavailableError(
    `Search failed after ${consecutiveFailures} attempts. Tried: ${errors.join("; ")}`
  );
}

/**
 * Search via SearXNG MCP (multi-query parallel).
 */
async function searchSearxngMCP(query: string, limit: number): Promise<SearchResult[]> {
  try {
    const r = await searchMCP(query, limit);
    if (r.length) return r;
  } catch (e) {
    console.error("[searxng] MCP search failed:", (e as Error).message);
  }
  return [];
}

/**
 * Search via SearXNG direct HTTP API.
 * Increased timeout and retry logic for resilience.
 */
async function searchSearxngDirect(query: string, limit: number): Promise<SearchResult[]> {
  const url = `${SEARXNG_BASE_URL}/search?q=${encodeURIComponent(
    query
  )}&format=json&safesearch=1`;

  // Try with increasing timeouts
  const timeouts = [8000, 12000, 15000];
  let lastErr: Error | null = null;

  for (const timeout of timeouts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(`HTTP 429 (rate limited) — engine may be suspended`);
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const results = Array.isArray(json?.results) ? json.results : [];
      return results.slice(0, limit).map(
        (r: { title?: string; url?: string; content?: string }): SearchResult => ({
          title: r.title || r.url || "Untitled",
          url: r.url || "",
          snippet: r.content || "",
        })
      );
    } catch (e) {
      lastErr = e as Error;
      // If the error is not a timeout, don't retry with longer timeout
      if (!(e instanceof DOMException && (e as DOMException).name === "AbortError")) {
        break;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr || new Error("Search request failed");
}

/**
 * Image search via SearXNG with retry and timeout escalation.
 */
export async function searchImages(
  query: string,
  limit = 6
): Promise<ImageResult[]> {
  const url = `${SEARXNG_BASE_URL}/search?q=${encodeURIComponent(
    query
  )}&category_images=1&format=json&safesearch=1`;

  const timeouts = [6000, 10000];
  let lastErr: Error | null = null;

  for (const timeout of timeouts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const results = Array.isArray(json?.results) ? json.results : [];
      return results.slice(0, limit).map(
        (r: {
          title?: string;
          url?: string;
          img_src?: string;
          thumbnail_src?: string;
          content?: string;
        }): ImageResult => ({
          title: r.title || "",
          url: r.url || "",
          imgSrc: r.img_src || r.thumbnail_src || "",
          thumbnailSrc: r.thumbnail_src || r.img_src || "",
          description: r.content || "",
        })
      );
    } catch (e) {
      lastErr = e as Error;
      if (!(e instanceof DOMException && (e as DOMException).name === "AbortError")) {
        break;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr || new Error("Image search failed");
}

/**
 * Force restart the SearXNG container.
 * Can be called from an API endpoint.
 */
export async function resetSearchBackend(): Promise<{ success: boolean; message: string }> {
  const ok = await restartSearxngContainer();
  if (ok) {
    consecutiveFailures = 0;
    return { success: true, message: "SearXNG restarted successfully" };
  }
  return { success: false, message: "Failed to restart SearXNG" };
}
