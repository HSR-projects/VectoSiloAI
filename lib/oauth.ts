import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import type { OAuthClientPublic } from "@/types";

/**
 * A minimal but real OAuth 2.0 authorization server powering "Sign in with
 * IncogniAI". Authorization-code grant with PKCE (S256), confidential client
 * secrets, exact redirect-URI matching, single-use short-lived codes, and
 * bearer access tokens. Backed by a JSON file (mirrors lib/auth.ts) so there's
 * no external DB — swap the store later without touching callers.
 *
 * Secrets, codes and tokens are only ever stored as sha256 hashes.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "oauth.json");

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export const SUPPORTED_SCOPES = ["openid", "profile", "email"] as const;

interface StoredClient extends OAuthClientPublic {
  secretHash: string;
  ownerId: string;
}
interface StoredCode {
  codeHash: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
}
interface StoredToken {
  tokenHash: string;
  clientId: string;
  userId: string;
  scope: string;
  expiresAt: number;
}
interface DB {
  clients: StoredClient[];
  codes: StoredCode[];
  tokens: StoredToken[];
}

async function readDB(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const d = JSON.parse(raw);
    return { clients: d.clients ?? [], codes: d.codes ?? [], tokens: d.tokens ?? [] };
  } catch {
    return { clients: [], codes: [], tokens: [] };
  }
}

async function writeDB(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const sha256url = (s: string) => createHash("sha256").update(s).digest("base64url");
const randToken = (n = 32) => randomBytes(n).toString("hex");

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    return ab.length === bb.length && timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

function toPublic(c: StoredClient): OAuthClientPublic {
  return {
    clientId: c.clientId,
    name: c.name,
    redirectUris: c.redirectUris,
    createdAt: c.createdAt,
    logoUrl: c.logoUrl,
  };
}

// ─── Client registration (developer dashboard) ──────────────────────────────

/** Register a new OAuth app. Returns the client plus the one-time plaintext secret. */
export async function createClient(
  ownerId: string,
  name: string,
  redirectUris: string[],
  logoUrl?: string,
): Promise<{ client: OAuthClientPublic; secret: string }> {
  const db = await readDB();
  const secret = `incogni_sk_${randToken(24)}`;
  const client: StoredClient = {
    clientId: `incogni_${randToken(12)}`,
    secretHash: sha256(secret),
    name: name.trim().slice(0, 80) || "Untitled app",
    ownerId,
    redirectUris: redirectUris.map((u) => u.trim()).filter(Boolean),
    logoUrl: logoUrl?.trim() || undefined,
    createdAt: Date.now(),
  };
  db.clients.push(client);
  await writeDB(db);
  return { client: toPublic(client), secret };
}

export async function listClients(ownerId: string): Promise<OAuthClientPublic[]> {
  const db = await readDB();
  return db.clients
    .filter((c) => c.ownerId === ownerId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(toPublic);
}

export async function deleteClient(ownerId: string, clientId: string): Promise<boolean> {
  const db = await readDB();
  const before = db.clients.length;
  db.clients = db.clients.filter((c) => !(c.clientId === clientId && c.ownerId === ownerId));
  if (db.clients.length === before) return false;
  // Cascade: drop codes/tokens for the removed client.
  db.codes = db.codes.filter((c) => c.clientId !== clientId);
  db.tokens = db.tokens.filter((t) => t.clientId !== clientId);
  await writeDB(db);
  return true;
}

export async function getClientPublic(clientId: string): Promise<OAuthClientPublic | null> {
  const db = await readDB();
  const c = db.clients.find((x) => x.clientId === clientId);
  return c ? toPublic(c) : null;
}

/** Whether a redirect URI exactly matches one the client registered. */
export async function isValidRedirect(clientId: string, redirectUri: string): Promise<boolean> {
  const db = await readDB();
  const c = db.clients.find((x) => x.clientId === clientId);
  return !!c && c.redirectUris.includes(redirectUri);
}

// ─── Authorization code ─────────────────────────────────────────────────────

export interface IssueCodeInput {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

/** Mint a single-use authorization code (after the user approves consent). */
export async function issueCode(input: IssueCodeInput): Promise<string> {
  const db = await readDB();
  const code = randToken(24);
  db.codes.push({
    codeHash: sha256(code),
    clientId: input.clientId,
    userId: input.userId,
    redirectUri: input.redirectUri,
    scope: input.scope,
    codeChallenge: input.codeChallenge,
    codeChallengeMethod: input.codeChallengeMethod,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
  // Opportunistically prune expired codes/tokens.
  const now = Date.now();
  db.codes = db.codes.filter((c) => c.expiresAt > now);
  db.tokens = db.tokens.filter((t) => t.expiresAt > now);
  await writeDB(db);
  return code;
}

export interface TokenResult {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}

/**
 * Exchange an authorization code for an access token. Validates the client
 * (secret for confidential clients OR PKCE verifier), exact redirect URI, and
 * code freshness. Consumes the code so it can't be replayed.
 */
export async function exchangeCode(params: {
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<{ ok: true; token: TokenResult } | { ok: false; error: string }> {
  const db = await readDB();
  const codeHash = sha256(params.code);
  const idx = db.codes.findIndex((c) => c.codeHash === codeHash);
  if (idx === -1) return { ok: false, error: "invalid_grant" };

  const stored = db.codes[idx];
  // Consume immediately (single-use), regardless of later validation outcome.
  db.codes.splice(idx, 1);
  await writeDB(db);

  if (stored.expiresAt < Date.now()) return { ok: false, error: "invalid_grant" };
  if (stored.clientId !== params.clientId) return { ok: false, error: "invalid_grant" };
  if (stored.redirectUri !== params.redirectUri) return { ok: false, error: "invalid_grant" };

  const client = db.clients.find((c) => c.clientId === params.clientId);
  if (!client) return { ok: false, error: "invalid_client" };

  // Auth: PKCE if a challenge was sent at authorize time, else client secret.
  if (stored.codeChallenge) {
    if (!params.codeVerifier) return { ok: false, error: "invalid_request" };
    const computed =
      stored.codeChallengeMethod === "plain"
        ? params.codeVerifier
        : sha256url(params.codeVerifier);
    if (computed !== stored.codeChallenge) return { ok: false, error: "invalid_grant" };
  } else {
    if (!params.clientSecret || !safeEqualHex(sha256(params.clientSecret), client.secretHash)) {
      return { ok: false, error: "invalid_client" };
    }
  }

  // Issue the access token.
  const accessToken = randToken(32);
  const fresh = await readDB();
  fresh.tokens.push({
    tokenHash: sha256(accessToken),
    clientId: params.clientId,
    userId: stored.userId,
    scope: stored.scope,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  await writeDB(fresh);

  return {
    ok: true,
    token: {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: Math.floor(TOKEN_TTL_MS / 1000),
      scope: stored.scope,
    },
  };
}

// ─── Access token verification (userinfo) ───────────────────────────────────

export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string; scope: string; clientId: string } | null> {
  const db = await readDB();
  const t = db.tokens.find((x) => x.tokenHash === sha256(token));
  if (!t || t.expiresAt < Date.now()) return null;
  return { userId: t.userId, scope: t.scope, clientId: t.clientId };
}

/** Normalise a requested scope string down to the scopes we support. */
export function sanitizeScope(raw: string | null | undefined): string {
  const requested = (raw ?? "").split(/[\s+]+/).filter(Boolean);
  const allowed = requested.filter((s) =>
    (SUPPORTED_SCOPES as readonly string[]).includes(s),
  );
  // Always grant at least basic profile access.
  if (allowed.length === 0) return "profile";
  return Array.from(new Set(allowed)).join(" ");
}
