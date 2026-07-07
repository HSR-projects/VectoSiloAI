import { NextResponse } from "next/server";
import { resolveKoderSession } from "@/lib/koderUsage";
import { listModels, DEFAULT_MODEL } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function kodaModelName(id: string, index: number): string {
  if (id === DEFAULT_MODEL || index === 0) return "KodaAI Koder";
  return `KodaAI Model ${index + 1}`;
}

export async function GET(req: Request) {
  const auth  = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 401 });

  const session = await resolveKoderSession(token);
  if (!session)  return NextResponse.json({ error: "Invalid token." }, { status: 401 });

  try {
    const raw    = await listModels();
    const models = raw.map((m, i) => ({
      id: m.name,
      name: kodaModelName(m.name, i),
      default: m.name === DEFAULT_MODEL,
    }));
    return NextResponse.json({ models, default: DEFAULT_MODEL });
  } catch {
    return NextResponse.json({
      models: [{ id: DEFAULT_MODEL, name: "KodaAI Koder", default: true }],
      default: DEFAULT_MODEL,
    });
  }
}
