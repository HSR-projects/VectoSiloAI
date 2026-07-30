import * as cheerio from "cheerio";
import { YoutubeTranscript } from "youtube-transcript";
import type { Source } from "@/types";

const MAX_CHARS = 2000;
const FETCH_TIMEOUT = 5000;
const IMAGE_FETCH_TIMEOUT = 3000;

// ─── YouTube helpers ───────────────────────────────────────────

export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/)/.test(url);
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function scrapeYouTube(url: string): Promise<{ source: Source; images: string[] } | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  // Fetch title from oEmbed (lightweight, no session required)
  let title = `YouTube Video (${videoId})`;
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (oembedRes.ok) {
      const oembed = await oembedRes.json() as { title?: string };
      if (oembed.title) title = oembed.title;
    }
  } catch { /* keep default title */ }

  // Fetch transcript via the youtube-transcript package (handles auth/signing internally)
  let transcript = "";
  try {
    const entries = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
    transcript = entries
      .map((e) => e.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
  } catch { /* no captions available */ }

  const content = transcript
    ? `[YouTube Video Transcript]\nTitle: ${title}\n\n${transcript}`
    : `YouTube Video: ${title}\n\nNo captions/transcript available for this video.`;

  // Fetch the video thumbnail as a page image for vision models
  const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const thumbB64 = await fetchImageBase64(thumbUrl);

  return {
    source: { url, title, content },
    images: thumbB64 ? [thumbB64] : [],
  };
}

// ─── Image fetching ────────────────────────────────────────────

/** Magic-byte checks for image formats Ollama vision models can decode. */
const IMAGE_MAGIC: ((b: Uint8Array) => boolean)[] = [
  // JPEG: FF D8 FF
  (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  // PNG: 89 50 4E 47
  (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  // WebP: RIFF .... WEBP at offset 8
  (b) =>
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  // BMP: BM
  (b) => b[0] === 0x42 && b[1] === 0x4d,
  // TIFF little-endian: II 2A 00
  (b) => b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00,
  // TIFF big-endian: MM 00 2A
  (b) => b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a,
];

/** Fetch an image and return it as raw base64 (no data: prefix). */
async function fetchImageBase64(imgUrl: string): Promise<string | null> {
  if (!imgUrl || imgUrl.startsWith("data:")) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT);
  try {
    const res = await fetch(imgUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; IncogniAI/1.0)" },
    });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 4 * 1024 * 1024) return null;
    const view = new Uint8Array(buf);
    if (view.length < 4) return null;
    // Guard: confirm actual bytes match a known image format. Some CDNs lie
    // about Content-Type and serve error pages / placeholders as "image/*".
    if (!IMAGE_MAGIC.some((check) => check(view))) return null;
    return Buffer.from(buf).toString("base64");
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Filter out obvious non-content images (spacers, tracking pixels). */
function isContentImage(src: string, pageUrl: string, visualExplore?: boolean): boolean {
  if (!src) return false;
  try {
    new URL(src);
  } catch {
    try {
      src = new URL(src, pageUrl).href;
    } catch {
      return false;
    }
  }
  const lower = src.toLowerCase();
  if (lower.startsWith("data:image/gif")) return false;
  if (/\/(pixel|spacer|1x1|blank|spinner|loading)\b/i.test(lower)) return false;
  if (!visualExplore) {
    if (/\/(icon|avatar|badge|favicon)\b/i.test(lower)) return false;
  }
  if (/\.(gif|ico)(\?|$)/i.test(lower)) return false;
  return true;
}

// ─── Regular page scraping ─────────────────────────────────────

async function scrapeOne(
  url: string,
  opts: { visualExplore?: boolean } = {}
): Promise<{ source: Source; imageUrls: string[] } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
      },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const ctype = res.headers.get("content-type") ?? "";
    const rawContent = await res.text();
    if (!rawContent.trim()) return null;

    let text = "";
    let title = url;
    let ogImage = "";
    let $: cheerio.CheerioAPI | null = null;

    if (ctype.includes("application/json")) {
      try {
        const parsed = JSON.parse(rawContent);
        text = JSON.stringify(parsed, null, 2).slice(0, MAX_CHARS);
        title = parsed.title || parsed.name || url;
      } catch {
        text = rawContent.slice(0, MAX_CHARS);
      }
    } else {
      $ = cheerio.load(rawContent);
      ogImage =
        $('meta[property="og:image"]').attr("content") ||
        $('meta[name="twitter:image"]').attr("content") ||
        "";

      title =
        $("title").first().text().trim() ||
        $('meta[property="og:title"]').attr("content") ||
        url;

      $("script, style, noscript, nav, footer, header, aside, form, iframe, svg, button").remove();

      const root = $("article").length
        ? $("article")
        : $("main").length
        ? $("main")
        : $("body");

      text = root
        .text()
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_CHARS);
    }

    if (!text) return null;

    if (opts.visualExplore) {
      text = `[Visual Page Exploration Mode: Human-like visual page viewing & layout analysis active.]\n\n${text}`;
    }

    // Extract content-worthy image URLs for vision analysis if visual exploration is allowed (Go/Pro/Max/Ultra)
    const imageUrls: string[] = [];
    if (opts.visualExplore !== false && $) {
      if (ogImage && isContentImage(ogImage, url, opts.visualExplore)) {
        try {
          imageUrls.push(new URL(ogImage, url).href);
        } catch {
          imageUrls.push(ogImage);
        }
      }
      $("img").each((_i, el) => {
        const maxImg = opts.visualExplore ? 6 : 3;
        if (imageUrls.length >= maxImg) return false;
        const src =
          $(el).attr("src") ||
          $(el).attr("data-src") ||
          $(el).attr("data-lazy-src") ||
          "";
        let resolved = src;
        try {
          resolved = new URL(src, url).href;
        } catch {
          /* keep original */
        }
        if (isContentImage(resolved, url, opts.visualExplore) && !imageUrls.includes(resolved)) {
          imageUrls.push(resolved);
        }
      });
    }

    return {
      source: { url, title: title.slice(0, 200), content: text },
      imageUrls,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Public API ────────────────────────────────────────────────

export interface ScrapeResult {
  sources: Source[];
  /** Base64 images extracted from scraped pages (for vision models). */
  pageImages: string[];
}

export interface ScrapeOptions {
  /** Enable human-like visual page exploration (snapshots/images). Restricted to Go/Pro/Max/Ultra. */
  visualExplore?: boolean;
}

/** Scrape multiple URLs. YouTube URLs get transcript extraction + thumbnail. */
export async function scrapeUrlsWithMedia(
  urls: string[],
  opts: ScrapeOptions = {}
): Promise<ScrapeResult> {
  const results = await Promise.all(
    urls.map(async (url) => {
      if (isYouTubeUrl(url)) {
        const yt = await scrapeYouTube(url);
        if (yt) return { source: yt.source, images: yt.images };
        return null;
      }
      const r = await scrapeOne(url, opts);
      if (!r) return null;
      // Fetch up to 4 page images for visual page exploration (Go/Pro/Max/Ultra); silently drop failures
      const maxImages = opts.visualExplore ? 4 : 1;
      const b64s = (
        await Promise.all(r.imageUrls.slice(0, maxImages).map(fetchImageBase64))
      ).filter((b): b is string => b !== null);
      return { source: r.source, images: b64s };
    })
  );

  const sources: Source[] = [];
  const pageImages: string[] = [];

  for (const r of results) {
    if (!r) continue;
    sources.push(r.source);
    pageImages.push(...r.images);
  }

  return { sources, pageImages };
}

/** Legacy compat — text-only scrape (no images). */
export async function scrapeUrls(urls: string[]): Promise<Source[]> {
  const { sources } = await scrapeUrlsWithMedia(urls);
  return sources;
}
