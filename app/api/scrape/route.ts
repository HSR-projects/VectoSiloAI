import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let urls: string[] = [];
  try {
    ({ urls } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ sources: [], pageImages: [] });
  }

  const safe = urls
    .filter((u) => typeof u === "string" && /^https?:\/\//i.test(u))
    .slice(0, 6);

  const { scrapeUrlsWithMedia } = await import("@/lib/scraper");
  const { sources, pageImages } = await scrapeUrlsWithMedia(safe);
  return NextResponse.json({ sources, pageImages });
}
