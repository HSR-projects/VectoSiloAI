import * as cheerio from "cheerio";

export interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  isMalicious: boolean;
}

// Basic internal blacklist for testing
const MALICIOUS_DOMAINS = [
  "free-robux.com",
  "grabify.link",
  "iplogger.org",
  "fake-login-page.com",
];

export async function verifyAndPreviewLink(url: string): Promise<LinkPreviewData> {
  const data: LinkPreviewData = {
    url,
    title: null,
    description: null,
    image: null,
    isMalicious: false,
  };

  try {
    const parsedUrl = new URL(url);
    if (MALICIOUS_DOMAINS.some(d => parsedUrl.hostname.includes(d))) {
      data.isMalicious = true;
      return data;
    }

    // Try to fetch metadata
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "IncogniAI-Bot/1.0" } });
    clearTimeout(timeoutId);

    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      
      data.title = $('meta[property="og:title"]').attr('content') || $('title').text() || null;
      data.description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
      data.image = $('meta[property="og:image"]').attr('content') || null;
    }
  } catch (e) {
    // Ignore fetch errors, just return basic data
  }

  return data;
}

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Build the absolute email-verification URL. Prefers APP_URL, falling back to
 * the request's origin/host so links work in dev and behind proxies.
 */
export function verifyLink(req: Request, token: string): string {
  const base = appBaseUrl(req);
  return `${base}/verify?token=${encodeURIComponent(token)}`;
}

export function appBaseUrl(req: Request): string {
  const env = process.env.APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
