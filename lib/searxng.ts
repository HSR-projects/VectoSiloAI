import type { ImageResult, MapPlace, SearchResult } from "@/types";
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

  // Attempt 4: Bulletproof DuckDuckGo Direct Fallback
  try {
    const ddgResults = await searchDuckDuckGoFallback(query, limit);
    if (ddgResults.length) {
      console.log(`[search] SearXNG failed; successfully retrieved ${ddgResults.length} results via DuckDuckGo fallback.`);
      return ddgResults;
    }
  } catch (e) {
    errors.push(`ddg: ${(e as Error).message}`);
  }

  throw new SearchUnavailableError(
    `Search failed after ${consecutiveFailures} attempts. Tried: ${errors.join("; ")}`
  );
}

/**
 * Bulletproof DuckDuckGo Direct HTML fallback when SearXNG engines are suspended.
 */
export async function searchDuckDuckGoFallback(query: string, limit: number): Promise<SearchResult[]> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: SearchResult[] = [];

    const resultBlocks = html.split(/<div[^>]*class="[^"]*result[^"]*"[^>]*>/i).slice(1);
    for (const block of resultBlocks) {
      if (results.length >= limit) break;
      const titleMatch = block.match(/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i) ||
                           block.match(/<td[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/td>/i);

      if (titleMatch) {
        let rawUrl = titleMatch[1];
        if (rawUrl.includes("uddg=")) {
          try {
            const u = new URL("https://duckduckgo.com" + rawUrl);
            rawUrl = decodeURIComponent(u.searchParams.get("uddg") || rawUrl);
          } catch {
            // keep rawUrl
          }
        }
        const title = titleMatch[2].replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim() : "";

        if (rawUrl.startsWith("http") && title) {
          results.push({ title, url: rawUrl, snippet });
        }
      }
    }
    return results;
  } catch (e) {
    console.error("[duckduckgo] Fallback search failed:", (e as Error).message);
    return [];
  }
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
 * Map place search via SearXNG (category_map=1).
 * Retrieves OpenStreetMap / Photon geocoding places, coordinates, and bounding boxes.
 */
export async function searchMaps(
  query: string,
  limit = 5
): Promise<MapPlace[]> {
  const url = `${SEARXNG_BASE_URL}/search?q=${encodeURIComponent(
    query
  )}&category_map=1&format=json&safesearch=1`;

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
        (r: any): MapPlace => ({
          title: r.title || "Map Location",
          latitude: typeof r.latitude === "number" ? r.latitude : parseFloat(r.latitude || "0"),
          longitude: typeof r.longitude === "number" ? r.longitude : parseFloat(r.longitude || "0"),
          address: r.address ? (typeof r.address === "string" ? r.address : JSON.stringify(r.address)) : undefined,
          boundingbox: Array.isArray(r.boundingbox) ? r.boundingbox : undefined,
          url: r.url || (r.latitude && r.longitude ? `https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=14/${r.latitude}/${r.longitude}` : undefined),
          category: r.type || r.class || r.category || "Location",
          description: r.content || r.title || "",
          imgSrc: r.img_src || r.thumbnail_src || r.thumbnail || undefined,
          rating: r.rating ? String(r.rating) : undefined,
          status: r.status || undefined,
        })
      ).filter((p: MapPlace) => !isNaN(p.latitude) && !isNaN(p.longitude) && (p.latitude !== 0 || p.longitude !== 0));
    } catch (e) {
      lastErr = e as Error;
      if (!(e instanceof DOMException && (e as DOMException).name === "AbortError")) {
        break;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  return [];
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
