/**
 * Issues a one-time OAuth code for Koder CLI after the user approves.
 * Called by the /koder/authorize page (POST after consent).
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODES_PATH = path.join(process.cwd(), "data", "koder-codes.json");
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Free and Go plan users cannot use Koder
  if (user.plan === "free" || user.plan === "go") {
    return NextResponse.json(
      { error: "Koder requires a Pro or Max subscription. Upgrade at chat.hsrprojects.org.", plan: user.plan },
      { status: 403 }
    );
  }

  const code = randomBytes(32).toString("hex");
  const now = Date.now();
  let state: string | undefined;
  try {
    const body = (await req.json()) as { state?: string };
    const raw = body?.state?.trim();
    if (raw && /^[a-f0-9]{32,128}$/i.test(raw)) state = raw;
  } catch {
    /* older browser flows can post without a JSON body */
  }

  const codes = await readCodes();
  // Remove stale codes + previous codes for this user
  const fresh = codes.filter((c) => c.expiresAt > now && c.userId !== user.id && (!state || c.state !== state));
  fresh.push({ code, userId: user.id, state, expiresAt: now + CODE_TTL_MS });
  await writeCodes(fresh);

  return NextResponse.json({ code: state ? undefined : code, ok: true });
}
