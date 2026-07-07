import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_HOSTS = [
  "raw.githubusercontent.com",
  "api.github.com",
  "unpkg.com",
  "cdn.jsdelivr.net",
  "esm.sh",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "i.imgur.com",
  "via.placeholder.com",
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing `url` query parameter." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return NextResponse.json({ error: "Only http/https URLs are allowed." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  const host = parsed.hostname;
  const isAllowed = ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h));
  if (!isAllowed) {
    return NextResponse.json({ error: "Domain not allowed. Contact admin to add it." }, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "KodaAI/1.0" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error (${res.status})` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const isImage = contentType.startsWith("image/");
    const isText = contentType.includes("text") || contentType.includes("json") || contentType.includes("javascript") || contentType.includes("xml") || contentType.includes("svg");

    if (isImage) {
      const buf = Buffer.from(await res.arrayBuffer());
      return new NextResponse(buf, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const text = await res.text();
    return NextResponse.json({ content: text, contentType, url });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Fetch failed." },
      { status: 502 }
    );
  }
}
