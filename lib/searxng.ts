import type { ImageResult, SearchResult } from "@/types";
import { searchMCP } from "./search-mcp";

const SEARXNG_BASE_URL = (
  process.env.SEARXNG_BASE_URL || "http://localhost:6767"
).replace(/\/$/, "");



export class SearchUnavailableError extends Error {
  constructor(message = "No search backend is available.") {
    super(message);
    this.name = "SearchUnavailableError";
  }
}

/**
 * Web search. Backend priority:
 *   1. SearXNG via MCP multi-query parallel (self-hosted Docker, primary — default http://localhost:6767)
 *   2. SearXNG direct HTTP fallback
 *   3. Brave Search API (if a key is configured)
 * Throws SearchUnavailableError if none respond, so callers can degrade to
 * "No Search" mode.
 */
export async function searchWeb(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  const errors: string[] = [];

  try {
    const r = await searchSearxng(query, limit);
    if (r.length) return r;
  } catch (e) {
    errors.push(`searxng: ${(e as Error).message}`);
  }

  throw new SearchUnavailableError(
    `No search results from SearXNG. Tried: ${errors.join("; ")}`
  );
}

async function searchSearxng(query: string, limit: number): Promise<SearchResult[]> {
  try {
    const r = await searchMCP(query, limit);
    if (r.length) return r;
  } catch (e) {
    console.error("[searxng] MCP search failed, falling back to direct HTTP:", (e as Error).message);
  }

  const url = `${SEARXNG_BASE_URL}/search?q=${encodeURIComponent(
    query
  )}&format=json&safesearch=1`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
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
      (r: { title?: string; url?: string; content?: string }): SearchResult => ({
        title: r.title || r.url || "Untitled",
        url: r.url || "",
        snippet: r.content || "",
      })
    );
  } finally {
    clearTimeout(timer);
  }
}


/**
 * Image search via SearXNG. Returns images with URLs, titles, and source pages.
 */
export async function searchImages(
  query: string,
  limit = 6
): Promise<ImageResult[]> {
  const url = `${SEARXNG_BASE_URL}/search?q=${encodeURIComponent(
    query
  )}&category_images=1&format=json&safesearch=1`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
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
  } finally {
    clearTimeout(timer);
  }
}

