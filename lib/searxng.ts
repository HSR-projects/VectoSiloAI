import type { ImageResult, MapPlace, SearchResult } from "@/types";
import { searchMCP } from "./search-mcp";
import { execSync } from "child_process";

const SEARXNG_BASE_URL = (
  process.env.SEARXNG_BASE_URL || "http://localhost:6767"
).replace(/\/$/, "");

// Track consecutive failures to trigger container restart
let consecutiveFailures = 0;
let lastRestartAt = 0;
const MAX_CONSECUTIVE_FAILURES = 1;
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
  limit = 15,
  category?: string,
  pageno = 1
): Promise<SearchResult[]> {
  const errors: string[] = [];

  // Attempt 1: MCP search
  if (!category) {
    try {
      const r = await searchSearxngMCP(query, limit);
      if (r.length) {
        consecutiveFailures = 0;
        return r;
      }
    } catch (e) {
      errors.push(`mcp: ${(e as Error).message}`);
    }
  }

  // Attempt 2: Direct HTTP (bypasses MCP)
  try {
    const r = await searchSearxngDirect(query, limit, category, pageno);
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
    const res = await fetch(`https://lite.duckduckgo.com/lite/`, {
      method: 'POST',
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: `q=${encodeURIComponent(query)}&s=0&dc=&v=1`,
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results: SearchResult[] = [];

    // Parse DuckDuckGo Lite table rows
    const trMatches = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/ig) || [];
    let currentTitle = "";
    let currentUrl = "";

    for (const tr of trMatches) {
      if (results.length >= limit) break;
      
      const titleMatch = tr.match(/<a[^>]*class="result-snippet"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = tr.match(/<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/i);
      
      if (titleMatch) {
        currentUrl = titleMatch[1];
        if (currentUrl.includes("uddg=")) {
          try {
            const u = new URL("https://duckduckgo.com" + currentUrl);
            currentUrl = decodeURIComponent(u.searchParams.get("uddg") || currentUrl);
          } catch { }
        }
        currentTitle = titleMatch[2].replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
      } else if (snippetMatch && currentTitle) {
        const snippet = snippetMatch[1].replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").trim();
        if (currentUrl.startsWith("http")) {
          results.push({ title: currentTitle, url: currentUrl, snippet });
        }
        currentTitle = "";
        currentUrl = "";
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
async function searchSearxngDirect(query: string, limit: number, category?: string, pageno = 1): Promise<SearchResult[]> {
  const url = `${SEARXNG_BASE_URL}/search?q=${encodeURIComponent(
    query
  )}&safesearch=1${category ? `&categories=${category}` : ''}&pageno=${pageno}`;

  // Try with increasing timeouts
  const timeouts = [8000, 12000, 15000];
  let lastErr: Error | null = null;

  for (const timeout of timeouts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: { Accept: "text/html" },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(`HTTP 429 (rate limited)`);
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const html = await res.text();
      const results: SearchResult[] = [];
      
      const articles = html.split(/<article[^>]*class="[^"]*result[^"]*"[^>]*>/i).slice(1);
      for (const article of articles) {
        if (results.length >= limit) break;
        
        const titleMatch = article.match(/<h[34][^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h[34]>/i);
        const contentMatch = article.match(/<p[^>]*class="content"[^>]*>([\s\S]*?)<\/p>/i);
        
        if (titleMatch) {
          const url = titleMatch[1];
          const decodeEntities = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
          
          const title = decodeEntities(titleMatch[2]);
          const snippet = contentMatch ? decodeEntities(contentMatch[1]) : "";
          
          if (url.startsWith("http")) {
            results.push({ url, title, snippet });
          }
        }
      }
      
      return results;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e as Error;
      console.error(`[searxng] direct attempt failed (${timeout}ms):`, (e as Error).message);
    }
  }

  throw lastErr || new Error("All timeout attempts failed");
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
  )}&category_images=1&safesearch=1`;

  const timeouts = [6000, 10000];
  let lastErr: Error | null = null;

  for (const timeout of timeouts) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        headers: { Accept: "text/html" },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const html = await res.text();
      const results: ImageResult[] = [];
      
      const articles = html.split(/<article[^>]*class="[^"]*result-images[^"]*"[^>]*>/i).slice(1);
      for (const article of articles) {
        if (results.length >= limit) break;
        
        const aMatch = article.match(/<a[^>]*href="([^"]+)"[^>]*>/i);
        const imgMatch = article.match(/<img[^>]*src="([^"]+)"[^>]*>/i);
        const titleMatch = article.match(/<span[^>]*class="title"[^>]*>([\s\S]*?)<\/span>/i);
        
        if (aMatch && imgMatch) {
          let src = imgMatch[1];
          if (src.startsWith("/image_proxy")) {
            src = SEARXNG_BASE_URL + src;
          }
          const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "Image";
          
          results.push({
            title,
            url: aMatch[1],
            imgSrc: src,
            thumbnailSrc: src,
            description: title
          });
        }
      }
      return results;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e as Error;
    }
  }

  throw lastErr || new Error("All timeout attempts failed");
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
