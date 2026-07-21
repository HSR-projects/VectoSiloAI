/**
 * Koder auth token exchange.
 * Accepts either:
 *   - { type: "oauth", code: "<one-time code from /koder/authorize>" }
 *   - { type: "apikey", key: "sk-vectosilo-..." }
 * Returns: { token: "kd-...", authType, userId }
 */

import { NextResponse } from "next/server";
import { getApiKeyAuth, getUserById } from "@/lib/auth";
import { createKoderSession } from "@/lib/koderUsage";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODES_PATH = path.join(process.cwd(), "data", "koder-codes.json");

interface KoderCode {
  code: string;
  userId: string;
  state?: string;
  expiresAt: number;
}

async function readCodes(): Promise<KoderCode[]> {
  try {
    const raw = await fs.readFile(CODES_PATH, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function writeCodes(codes: KoderCode[]): Promise<void> {
  await fs.mkdir(path.dirname(CODES_PATH), { recursive: true });
  await fs.writeFile(CODES_PATH, JSON.stringify(codes));
}

export async function POST(req: Request) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { type } = body;

  // ── API key auth ──────────────────────────────────────────────────────────
  if (type === "apikey") {
    const { key } = body;
    if (!key?.startsWith("sk-vectosilo-")) {
      return NextResponse.json({ error: "Invalid API key format." }, { status: 401 });
    }
    const auth = await getApiKeyAuth(key);
    if (!auth) {
      return NextResponse.json({ error: "API key not found." }, { status: 401 });
    }
    const token = await createKoderSession(auth.user.id, "apikey", auth.key.id);
    return NextResponse.json({ token, authType: "apikey", userId: auth.user.id, name: auth.user.name });
  }

  // ── OAuth code exchange ───────────────────────────────────────────────────
  if (type === "oauth") {
    const { code } = body;
    if (!code) return NextResponse.json({ error: "Missing code." }, { status: 400 });

    const now = Date.now();
    const codes = await readCodes();
    const idx = codes.findIndex((c) => c.code === code && c.expiresAt > now);
    if (idx === -1) {
      return NextResponse.json({ error: "Code invalid or expired." }, { status: 401 });
    }

    const { userId } = codes[idx];
    // Single-use — remove the code
    codes.splice(idx, 1);
    await writeCodes(codes);

    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const token = await createKoderSession(userId, "subscription");
    return NextResponse.json({ token, authType: "subscription", userId, name: user.name });
  }

  // ── Hosted login polling for the Koder CLI ───────────────────────────────
  if (type === "poll") {
    const { state } = body;
    if (!state || !/^[a-f0-9]{32,128}$/i.test(state)) {
      return NextResponse.json({ error: "Missing login state." }, { status: 400 });
    }

    const now = Date.now();
    const codes = await readCodes();
    const idx = codes.findIndex((c) => c.state === state && c.expiresAt > now);
    if (idx === -1) {
      return NextResponse.json({ pending: true }, { status: 202 });
    }

    const { userId } = codes[idx];
    codes.splice(idx, 1);
    await writeCodes(codes);

    const user = await getUserById(userId);
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const token = await createKoderSession(userId, "subscription");
    return NextResponse.json({ token, authType: "subscription", userId, name: user.name });
  }

  return NextResponse.json({ error: "Unknown auth type." }, { status: 400 });
}
