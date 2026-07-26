import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { effectiveCaps } from "@/lib/plans";

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
    .filter((u) => typeof u === "string" && u.trim().length > 0)
    .map((u) => {
      const trimmed = u.trim();
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return `https://${trimmed}`;
    })
    .slice(0, 6);

  const currentUser = await getCurrentUser();
  const userPlan = currentUser?.plan ?? "free";
  const caps = effectiveCaps(userPlan);

  const { scrapeUrlsWithMedia } = await import("@/lib/scraper");
  const { sources, pageImages } = await scrapeUrlsWithMedia(safe, { visualExplore: caps.visualPageExplore });
  return NextResponse.json({ sources, pageImages });
}
