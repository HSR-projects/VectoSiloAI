import type { ImageResult, SearchResult } from "@/types";
import { searchMCP } from "./search-mcp";

const SEARXNG_BASE_URL = (
  process.env.SEARXNG_BASE_URL || "http://localhost:6767"
).replace(/\/$/, "");

const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY || "";
const SERPER_KEY = process.env.SERPER_API_KEY || "";

export class SearchUnavailableError extends Error {
  constructor(message = "No search backend is available.") {
    super(message);
    this.name = "SearchUnavailableError";
  }
}

/**
 * Web search. Backend priority:
 *   1. Serper.dev (Google, if key configured)
 *   2. SearXNG via MCP multi-query parallel (self-hosted Docker, default http://localhost:6767)
 *   3. SearXNG direct HTTP fallback
 *   4. Brave Search API (if a key is configured)
 * Throws SearchUnavailableError if none respond, so callers can degrade to
 * "No Search" mode.
 */
export async function searchWeb(
  query: string,
  limit = 5
): Promise<SearchResult[]> {
  const errors: string[] = [];

  if (SERPER_KEY) {
    try {
      const r = await searchSerper(query, limit);
      if (r.length) return r;
    } catch (e) {
      errors.push(`serper: ${(e as Error).message}`);
    }
  }

  try {
    const r = await searchSearxng(query, limit);
    if (r.length) return r;
  } catch (e) {
    errors.push(`searxng: ${(e as Error).message}`);
  }

  if (BRAVE_KEY) {
    try {
      const r = await searchBrave(query, limit);
      if (r.length) return r;
    } catch (e) {
      errors.push(`brave: ${(e as Error).message}`);
    }
  }

  throw new SearchUnavailableError(
    `No search results. Tried: ${errors.join("; ") || "no backends configured"}`
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

async function searchSerper(query: string, limit: number): Promise<SearchResult[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": SERPER_KEY,
    },
    body: JSON.stringify({ q: query, num: limit }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const organic: { title?: string; link?: string; snippet?: string }[] = json?.organic ?? [];
  return organic.slice(0, limit).map((r) => ({
    title: r.title || r.link || "Untitled",
    url: r.link || "",
    snippet: r.snippet || "",
  }));
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

async function searchBrave(query: string, limit: number): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
    query
  )}&count=${limit}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": BRAVE_KEY,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const results = json?.web?.results ?? [];
  return results
    .slice(0, limit)
    .map(
      (r: { title?: string; url?: string; description?: string }): SearchResult => ({
        title: r.title || r.url || "Untitled",
        url: r.url || "",
        snippet: r.description || "",
      })
    );
}
