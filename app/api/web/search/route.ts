import { NextResponse } from "next/server";
import { searchWeb, SearchUnavailableError } from "@/lib/searxng";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let query = "";
  let category = "";
  let pageno = 1;
  try {
    const body = await req.json();
    query = body.query;
    category = body.category || "";
    pageno = body.pageno || 1;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!query?.trim()) {
    return NextResponse.json({ error: "Missing query." }, { status: 400 });
  }

  try {
    // Search the web using the existing SearXNG integration
    const results = await searchWeb(query, 15, category, pageno);
    return NextResponse.json({ results });
  } catch (e) {
    const unavailable = e instanceof SearchUnavailableError;
    return NextResponse.json(
      {
        results: [],
        error: unavailable
          ? "Search backend unavailable."
          : "Search failed.",
        unavailable,
      },
      { status: unavailable ? 503 : 500 }
    );
  }
}
