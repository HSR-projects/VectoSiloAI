import { NextRequest, NextResponse } from "next/server";
import { scaffoldTemplate } from "@/lib/scaffold";
import registry from "@/templates/registry/registry.json";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, props } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing required field: id" }, { status: 400 });
    }

    const templates = (registry.templates as Record<string, any>);
    if (!templates[id]) {
      return NextResponse.json({
        error: `Template "${id}" not found`,
        available: Object.keys(templates),
      }, { status: 404 });
    }

    const files = scaffoldTemplate({
      id,
      title: title || id,
      props: props || {},
    });

    // Generate setup commands
    const setupCmds = [
      "npm install",
      "npm run dev",
    ];

    return NextResponse.json({
      success: true,
      template: id,
      title: title || id,
      fileCount: files.length,
      files,
      commands: setupCmds,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET variant for quick curl from sandbox
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const title = searchParams.get("title") || undefined;

  if (!id) {
    return NextResponse.json({
      error: "Missing ?id= parameter",
      examples: Object.keys(registry.templates as Record<string, any>).slice(0, 10),
    }, { status: 400 });
  }

  const templates = (registry.templates as Record<string, any>);
  if (!templates[id]) {
    return NextResponse.json({ error: `Template "${id}" not found` }, { status: 404 });
  }

  // For GET, return bash setup script for easy curl | bash usage
  const files = scaffoldTemplate({ id, title: title || id, props: {} });

  // Generate a bash script that creates all files
  const mkdirs = new Set<string>();
  for (const f of files) {
    if (f.path.includes("/")) {
      mkdirs.add(f.path.substring(0, f.path.lastIndexOf("/")));
    }
  }
  const bashScript = `#!/bin/bash
# VectoSiloAI Scaffold — ${id}
set -e
echo "📦 Scaffolding ${title || id}..."
${[...mkdirs].map(d => `mkdir -p ${d}`).join("\n")}
${files.map(f => {
  const escaped = f.content
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\\`")
    .replace(/\$/g, "\\$");
  return `cat > ${f.path} << 'VECTOSILOEOF'\n${escaped}\nVECTOSILOEOF`;
}).join("\n")}
echo "✅ Files created — installing dependencies..."
npm install
echo "🚀 Starting dev server..."
npm run dev`;

  // Also offer JSON response with files
  const accept = req.headers.get("accept") || "";
  const wantsJson = !accept.includes("text/plain") && !searchParams.has("bash");

  if (!wantsJson) {
    return new NextResponse(bashScript, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return NextResponse.json({
    success: true,
    template: id,
    title: title || id,
    fileCount: files.length,
    files,
    commands: ["npm install", "npm run dev"],
    setupScript: bashScript,
    tip: "Pipe to bash: curl -s 'https://chat.hsrprojects.org/api/templates/scaffold?id=TEMPLATE_ID&title=My%20App' | bash",
  });
}
