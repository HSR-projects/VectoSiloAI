import { NextResponse } from "next/server";
import registry from "@/templates/registry/registry.json";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");
  const id = searchParams.get("id");

  if (id) {
    const tmpl = (registry.templates as Record<string, any>)[id];
    if (!tmpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    return NextResponse.json({
      id,
      ...tmpl,
      category: (registry.categories as Record<string, any>)[tmpl.category],
      templateCount: registry.total,
    });
  }

  let entries = Object.entries(registry.templates as Record<string, any>);

  if (category) {
    const cat = (registry.categories as Record<string, any>)[category];
    if (!cat) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    entries = entries.filter(([, v]) => v.category === category);
  }

  if (q) {
    const lower = q.toLowerCase();
    entries = entries.filter(([id, v]) =>
      id.includes(lower) || v.description?.toLowerCase().includes(lower)
    );
  }

  return NextResponse.json({
    count: entries.length,
    total: registry.total,
    categories: registry.categories,
    templates: entries.map(([id, v]) => ({
      id,
      ...v,
    })),
  });
}
