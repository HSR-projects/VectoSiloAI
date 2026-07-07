import { promises as fs } from "node:fs";
import path from "node:path";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
  createHash,
} from "node:crypto";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import type { ApiKeyPublic, Plan, User } from "@/types";
import { checkEmailDomain } from "@/lib/disposableEmail";

/**
 * Minimal but real authentication: salted-scrypt password hashing and
 * HMAC-signed httpOnly session cookies, backed by a JSON file. No external DB
 * required — swap the store for Postgres/Prisma later without touching callers.
 *
 * Payments are intentionally NOT here: upgrades are applied directly to the
 * stored user (dummy billing) until a real processor is wired in.
 */

export const SESSION_COOKIE = "koda_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const AUTH_SECRET =
  process.env.AUTH_SECRET || "koda-dev-secret-change-me-in-production";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "auth.json");

export interface StoredApiKey {
  id: string;
  name: string;
  /** sha256 hex of the full secret — the secret itself is never stored. */
  hash: string;
  last4: string;
  createdAt: number;
  lastUsedAt?: number;
  revoked?: boolean;
  /** Optional max spend for this key, in US cents. */
  creditLimitCents?: number;
  /** Credits already spent through this key, in US cents. */
  spentCents?: number;
}

export interface StoredUser extends User {
  passwordHash: string; // "salthex:hashhex" — empty string for OAuth-only accounts
  razorpayOrderId?: string;
  razorpaySubscriptionId?: string;
  apiKeys?: StoredApiKey[];
  /** Razorpay order/session IDs already credited — guards double fulfillment. */
  creditedSessions?: string[];
  /** Email-verification token (sha256 hex) + expiry. Cleared once verified. */
  verifyTokenHash?: string;
  verifyTokenExp?: number;
  /** Password-reset token (sha256 hex) + expiry. */
  resetTokenHash?: string;
  resetTokenExp?: number;
  /** Firebase UID — set when the account was created or linked via Google Sign-In. */
  googleId?: string;
  /** URL of the user's Google profile picture (display only). */
  googlePicture?: string;
  /** Start of the current rolling usage window (ms epoch). Free-tier metering. */
  usageWindowStart?: number;
  /** Messages used in the current window. */
  usageCount?: number;
  /** Personalization & memory (injected into the chat system prompt). */
  memoryEnabled?: boolean;
  /** Free-text "who you are / your details" the user wrote about themselves. */
  aboutYou?: string;
  /** Free-text "how the assistant should respond" preferences. */
  responsePrefs?: string;
  /** Facts the assistant saved over time (auto-memory). */
  memories?: MemoryItem[];
  /** Encrypted TOTP secret for two-factor authentication. */
  twoFactorSecret?: string;
  /** Whether two-factor authentication is enabled. */
  twoFactorEnabled?: boolean;
  /** Bcrypt-hashed backup codes (one-time-use). */
  twoFactorBackupCodes?: string[];
}

export interface MemoryItem {
  id: string;
  text: string;
  createdAt: number;
}

export interface UserMemory {
  memoryEnabled: boolean;
  aboutYou: string;
  responsePrefs: string;
  memories: MemoryItem[];
}

/** Cap on auto-saved memories to keep the prompt and store bounded. */
const MEMORY_LIMIT = 100;

const VERIFY_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

interface DB {
  users: StoredUser[];
}

// ─── Storage ──────────────────────────────────────────────────
/** Exported for use by other stores (orgs, gifts, etc.). */
export async function readDB(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const db = JSON.parse(raw) as DB;
    if (!Array.isArray(db.users)) return { users: [] };
    return db;
  } catch {
    return { users: [] };
  }
}

/** Exported for use by other stores (orgs, gifts, etc.). */
export async function writeDB(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

/** Whitelist the fields safe to expose — never key hashes, Razorpay IDs, or password. */
function publicUser(u: StoredUser): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    plan: u.plan,
    onboarded: u.onboarded,
    defaultAgent: u.defaultAgent,
    avatarColor: u.avatarColor,
    createdAt: u.createdAt,
    emailVerified: u.emailVerified ?? false,
    credits: u.credits ?? 0,
    twoFactorEnabled: u.twoFactorEnabled ?? false,
  };
}

// ─── Passwords ────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;

/** Hash a password with bcrypt (current scheme). */
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** True if a stored hash is the current bcrypt scheme (vs legacy scrypt). */
function isBcryptHash(stored: string): boolean {
  return /^\$2[aby]\$/.test(stored);
}

/** Verify a legacy scrypt hash ("salthex:hashhex"). */
function verifyLegacyScrypt(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const hash = Buffer.from(hashHex, "hex");
  const test = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  return hash.length === test.length && timingSafeEqual(hash, test);
}

/** Verify a password against either a bcrypt or a legacy scrypt hash. */
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) return bcrypt.compare(password, stored);
  return verifyLegacyScrypt(password, stored);
}

// ─── Sessions (signed cookie) ─────────────────────────────────
function sign(payload: string): string {
  return createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const body = JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_MS });
  const payload = Buffer.from(body).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    const { uid, exp } = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { uid: string; exp: number };
    if (!uid || typeof exp !== "number" || exp < Date.now()) return null;
    return uid;
  } catch {
    return null;
  }
}

// ─── Public API ───────────────────────────────────────────────
export class AuthError extends Error {}
/** Thrown when a correct login is blocked because the email isn't verified. */
export class EmailNotVerifiedError extends AuthError {
  constructor(public email: string) {
    super("Please verify your email before signing in.");
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Mint a fresh verification token; returns the plaintext (emailed) + stores the hash. */
function issueVerifyToken(user: StoredUser): string {
  const token = randomBytes(24).toString("hex");
  user.verifyTokenHash = hashToken(token);
  user.verifyTokenExp = Date.now() + VERIFY_TTL_MS;
  return token;
}

/**
 * Change the current user's password (requires correct current password).
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 8) throw new AuthError("New password must be at least 8 characters.");

  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new AuthError("User not found.");

  // OAuth-only accounts can't change password (they don't have one).
  if (!user.passwordHash) throw new AuthError("This account uses Google sign-in — no password to change.");

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new AuthError("Current password is incorrect.");

  user.passwordHash = await hashPassword(newPassword);
  await writeDB(db);
}

/**
 * Issue a password-reset token for the given email.
 * Returns the plaintext token (to be emailed) or null if the email doesn't exist
 * (callers should NOT reveal whether the email was found).
 */
export async function issuePasswordResetToken(email: string): Promise<string | null> {
  const normEmail = email.trim().toLowerCase();
  const db = await readDB();
  const user = db.users.find((u) => u.email === normEmail);
  if (!user || !user.passwordHash) return null; // no local-password account

  const token = randomBytes(24).toString("hex");
  user.resetTokenHash = hashToken(token);
  user.resetTokenExp = Date.now() + VERIFY_TTL_MS;
  await writeDB(db);
  return token;
}

/**
 * Verify a password-reset token and update the password.
 * On success, clears the token and returns a session token so the user
 * is signed in automatically.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ user: User; token: string }> {
  if (!token) throw new AuthError("Missing reset token.");
  if (newPassword.length < 8) throw new AuthError("New password must be at least 8 characters.");

  const hash = hashToken(token);
  const db = await readDB();
  const user = db.users.find((u) => u.resetTokenHash === hash);
  if (!user) throw new AuthError("Invalid or expired reset link.");
  if (!user.resetTokenExp || user.resetTokenExp < Date.now()) {
    user.resetTokenHash = undefined;
    user.resetTokenExp = undefined;
    await writeDB(db);
    throw new AuthError("This reset link has expired. Request a new one.");
  }

  // Update password + clear the token
  user.passwordHash = await hashPassword(newPassword);
  user.resetTokenHash = undefined;
  user.resetTokenExp = undefined;
  await writeDB(db);

  return { user: publicUser(user), token: createSessionToken(user.id) };
}

/**
 * Normalise an email for uniqueness checks:
 * - Lowercase
 * - Strip `+tag` sub-addressing (supported by Gmail, Outlook, etc.) so
 *   `user+spam@gmail.com` can't bypass the duplicate check vs `user@gmail.com`.
 */
function canonicalEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.split("+")[0]}@${domain}`;
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ user: User; verifyToken: string }> {
  const normEmail = email.trim().toLowerCase();
  if (!name.trim()) throw new AuthError("Name is required.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normEmail))
    throw new AuthError("Enter a valid email.");
  if (password.length < 8)
    throw new AuthError("Password must be at least 8 characters.");

  // Smart disposable / unreachable-domain rejection (remote list + MX).
  const domainCheck = await checkEmailDomain(normEmail);
  if (!domainCheck.ok) throw new AuthError(domainCheck.reason ?? "Enter a valid email.");

  const db = await readDB();
  // Check both the raw email AND the canonical form (strips + aliases) to
  // prevent sub-addressing tricks from creating duplicate accounts.
  const canonical = canonicalEmail(normEmail);
  if (db.users.some((u) => u.email === normEmail || canonicalEmail(u.email) === canonical))
    throw new AuthError("An account with that email already exists.");

  const user: StoredUser = {
    id: randomBytes(9).toString("hex"),
    name: name.trim(),
    email: normEmail,
    plan: "free",
    onboarded: false,
    createdAt: Date.now(),
    emailVerified: false,
    credits: 0,
    passwordHash: await hashPassword(password),
  };
  const verifyToken = issueVerifyToken(user);
  db.users.push(user);
  await writeDB(db);

  // No session token — the user must verify before they can sign in.
  return { user: publicUser(user), verifyToken };
}

export type LoginResult = { user: User; token: string; twoFactorToken?: string };

export async function loginUser(
  email: string,
  password: string
): Promise<LoginResult> {
  const normEmail = email.trim().toLowerCase();

  // Block sign-in from disposable / no-MX domains, even if the account already exists.
  const domainCheck = await checkEmailDomain(normEmail);
  if (!domainCheck.ok) {
    throw new AuthError(domainCheck.reason ?? "This email address is not allowed.");
  }

  const db = await readDB();
  const user = db.users.find((u) => u.email === normEmail);
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    throw new AuthError("Incorrect email or password.");
  if (!user.emailVerified) throw new EmailNotVerifiedError(normEmail);

  // Transparently upgrade legacy scrypt hashes to bcrypt on successful login.
  if (!isBcryptHash(user.passwordHash)) {
    user.passwordHash = await hashPassword(password);
    await writeDB(db);
  }

  // If 2FA is enabled, issue a short-lived challenge token instead of a session.
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const { createTwoFactorToken } = await import("@/lib/twoFactor");
    const twoFactorToken = createTwoFactorToken(user.id);
    return { user: publicUser(user), token: "", twoFactorToken };
  }

  return { user: publicUser(user), token: createSessionToken(user.id) };
}

/**
 * Verify an email by its token. On success, marks the user verified and returns
 * a session token so they're signed in immediately.
 */
export async function verifyEmailToken(
  token: string
): Promise<{ user: User; token: string }> {
  if (!token) throw new AuthError("Missing verification token.");
  const hash = hashToken(token);
  const db = await readDB();
  const user = db.users.find((u) => u.verifyTokenHash === hash);
  if (!user) {
    // Already-verified users have no token — give a friendlier message.
    throw new AuthError("This verification link is invalid or has already been used.");
  }
  if (!user.verifyTokenExp || user.verifyTokenExp < Date.now()) {
    throw new AuthError("This verification link has expired. Request a new one.");
  }

  user.emailVerified = true;
  user.verifyTokenHash = undefined;
  user.verifyTokenExp = undefined;
  await writeDB(db);

  return { user: publicUser(user), token: createSessionToken(user.id) };
}

/**
 * Regenerate a verification token for an unverified account (resend). Returns
 * null when there's nothing to do (no account, or already verified) — callers
 * should respond identically either way to avoid leaking which emails exist.
 */
export async function regenerateVerifyToken(
  email: string
): Promise<{ user: User; verifyToken: string } | null> {
  const normEmail = email.trim().toLowerCase();
  const db = await readDB();
  const user = db.users.find((u) => u.email === normEmail);
  if (!user || user.emailVerified) return null;
  const verifyToken = issueVerifyToken(user);
  await writeDB(db);
  return { user: publicUser(user), verifyToken };
}

/** Resolve the signed-in user from the request's session cookie, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const uid = verifySessionToken(token);
  if (!uid) return null;
  const db = await readDB();
  const user = db.users.find((u) => u.id === uid);
  return user ? publicUser(user) : null;
}

/** Resolve a public user by id (used by the OAuth userinfo endpoint). */
export async function getUserById(userId: string): Promise<User | null> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  return user ? publicUser(user) : null;
}

/** Return the full StoredUser for a given user ID (includes sensitive fields). */
export async function getStoredUserById(userId: string): Promise<StoredUser | null> {
  const db = await readDB();
  return db.users.find((u) => u.id === userId) ?? null;
}

/** Persist changes to a stored user after reading via getStoredUserById. */
export async function saveStoredUser(user: StoredUser): Promise<void> {
  const db = await readDB();
  const idx = db.users.findIndex((u) => u.id === user.id);
  if (idx !== -1) db.users[idx] = user;
  await writeDB(db);
}

/** Patch the current user (onboarding flags, plan, default agent, avatar…). */
export async function updateUser(
  userId: string,
  patch: Partial<Pick<User, "name" | "plan" | "onboarded" | "defaultAgent" | "avatarColor">>
): Promise<User> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new AuthError("User not found.");
  Object.assign(user, patch);
  await writeDB(db);
  return publicUser(user);
}

export const PLAN_RANK: Record<Plan, number> = { free: 0, go: 1, pro: 2, max: 3, ultra: 4 };

/** Permanently remove a user from the database. */
export async function deleteUser(userId: string): Promise<void> {
  const db = await readDB();
  db.users = db.users.filter((u) => u.id !== userId);
  await writeDB(db);
}

/** Store Razorpay order/subscription IDs on the user record. */
export async function updateUserRazorpay(
  userId: string,
  data: { razorpayOrderId?: string; razorpaySubscriptionId?: string }
): Promise<void> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new AuthError("User not found.");
  if (data.razorpayOrderId) user.razorpayOrderId = data.razorpayOrderId;
  if (data.razorpaySubscriptionId) user.razorpaySubscriptionId = data.razorpaySubscriptionId;
  await writeDB(db);
}

/** Read a user's stored Razorpay identifiers (server-only). */
export async function getUserRazorpayIds(
  userId: string
): Promise<{ orderId?: string; subscriptionId?: string }> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  return {
    orderId: user?.razorpayOrderId,
    subscriptionId: user?.razorpaySubscriptionId,
  };
}

/** Set a user back to the Free plan and clear their subscription link. */
export async function setUserFree(userId: string): Promise<User> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new AuthError("User not found.");
  user.plan = "free";
  user.razorpaySubscriptionId = undefined;
  await writeDB(db);
  return publicUser(user);
}

/** Downgrade the user whose Razorpay subscription ID matches to free. */
export async function downgradeBySubscriptionId(subscriptionId: string): Promise<void> {
  const db = await readDB();
  const user = db.users.find((u) => u.razorpaySubscriptionId === subscriptionId);
  if (user) {
    user.plan = "free";
    user.razorpaySubscriptionId = undefined;
    await writeDB(db);
  }
}

// ─── API keys ─────────────────────────────────────────────────
const API_KEY_PREFIX = "sk-koda-";

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function maskKey(k: StoredApiKey): ApiKeyPublic {
  return {
    id: k.id,
    name: k.name,
    last4: k.last4,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt,
    revoked: k.revoked,
    creditLimitCents: k.creditLimitCents,
    spentCents: k.spentCents ?? 0,
  };
}

/** List a user's API keys (masked — never the full secret). */
export async function listApiKeys(userId: string): Promise<ApiKeyPublic[]> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  return (user?.apiKeys ?? []).filter((k) => !k.revoked).map(maskKey);
}

/**
 * Create a new API key. Returns the full secret **once** (never recoverable
 * afterward) plus the masked record.
 */
export async function createApiKey(
  userId: string,
  name: string,
  creditLimitCents?: number
): Promise<{ secret: string; key: ApiKeyPublic }> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new AuthError("User not found.");

  const active = (user.apiKeys ?? []).filter((k) => !k.revoked);
  if (active.length >= 20) throw new AuthError("API key limit reached (20).");

  const secret = API_KEY_PREFIX + randomBytes(24).toString("hex");
  const cleanLimit =
    typeof creditLimitCents === "number" && Number.isFinite(creditLimitCents)
      ? Math.max(0, Math.round(creditLimitCents))
      : undefined;
  const record: StoredApiKey = {
    id: randomBytes(8).toString("hex"),
    name: name.trim().slice(0, 60) || "Default key",
    hash: hashApiKey(secret),
    last4: secret.slice(-4),
    createdAt: Date.now(),
    ...(cleanLimit && cleanLimit > 0 ? { creditLimitCents: cleanLimit } : {}),
    spentCents: 0,
  };
  user.apiKeys = [...(user.apiKeys ?? []), record];
  await writeDB(db);

  return { secret, key: maskKey(record) };
}

/** Revoke (soft-delete) an API key by id. */
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user?.apiKeys) return;
  const key = user.apiKeys.find((k) => k.id === keyId);
  if (key) key.revoked = true;
  await writeDB(db);
}

/** Resolve a user from a bearer API key, updating its last-used timestamp. */
export async function getUserByApiKey(secret: string): Promise<User | null> {
  const auth = await getApiKeyAuth(secret);
  return auth?.user ?? null;
}

/** Resolve a user and masked key metadata from a bearer API key. */
export async function getApiKeyAuth(
  secret: string
): Promise<{ user: User; key: ApiKeyPublic } | null> {
  if (!secret?.startsWith(API_KEY_PREFIX)) return null;
  const hash = hashApiKey(secret);
  const db = await readDB();
  const user = db.users.find((u) =>
    (u.apiKeys ?? []).some((k) => k.hash === hash && !k.revoked)
  );
  if (!user) return null;
  const key = user.apiKeys!.find((k) => k.hash === hash);
  if (key) {
    key.lastUsedAt = Date.now();
    await writeDB(db);
  }
  return key ? { user: publicUser(user), key: maskKey(key) } : null;
}

// ─── Credits (prepaid, US cents) ──────────────────────────────
/** Add credits to a user's balance (Razorpay payment fulfillment). */
export async function addCredits(userId: string, cents: number): Promise<number> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new AuthError("User not found.");
  user.credits = Math.max(0, (user.credits ?? 0) + Math.round(cents));
  await writeDB(db);
  return user.credits;
}

/**
 * Idempotently credit a paid Razorpay session. Safe to call from both the webhook
 * and the verify route — the second call for the same session is a no-op.
 * Returns the (possibly unchanged) balance.
 */
export async function fulfillCreditSession(
  userId: string,
  sessionId: string,
  cents: number
): Promise<number> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new AuthError("User not found.");
  const ledger = user.creditedSessions ?? [];
  if (ledger.includes(sessionId)) return user.credits ?? 0; // already credited
  user.credits = Math.max(0, (user.credits ?? 0) + Math.round(cents));
  user.creditedSessions = [...ledger, sessionId];
  await writeDB(db);
  return user.credits;
}

/**
 * Atomically deduct credits for an API call. Returns the new balance, or null
 * if the balance is insufficient (no deduction made).
 */
export async function deductCredits(
  userId: string,
  cents: number,
  apiKeyId?: string
): Promise<number | null> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return null;
  const charge = Math.max(0, Math.round(cents));
  const balance = user.credits ?? 0;
  if (balance < charge) return null;
  if (apiKeyId) {
    const key = (user.apiKeys ?? []).find((k) => k.id === apiKeyId && !k.revoked);
    if (!key) return null;
    const spent = key.spentCents ?? 0;
    const limit = key.creditLimitCents;
    if (typeof limit === "number" && spent + charge > limit) return null;
    key.spentCents = spent + charge;
  }
  user.credits = balance - charge;
  await writeDB(db);
  return user.credits;
}

/** Read a user's current credit balance. */
export async function getCredits(userId: string): Promise<number> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  return user?.credits ?? 0;
}

/** Maximum amount that can currently be billed, considering account and key cap. */
export async function getBillableCredits(userId: string, apiKeyId?: string): Promise<number> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return 0;
  const balance = user.credits ?? 0;
  if (!apiKeyId) return balance;
  const key = (user.apiKeys ?? []).find((k) => k.id === apiKeyId && !k.revoked);
  if (!key) return 0;
  if (typeof key.creditLimitCents !== "number") return balance;
  return Math.max(0, Math.min(balance, key.creditLimitCents - (key.spentCents ?? 0)));
}

// ─── Free-tier usage metering ─────────────────────────────────

/** Messages a Free user may send per rolling window (configurable). */
export const FREE_MESSAGE_LIMIT = Number(process.env.FREE_MESSAGE_LIMIT || 15);
/** Length of the rolling usage window in hours. */
export const USAGE_WINDOW_HOURS = Number(process.env.USAGE_WINDOW_HOURS || 8);
const USAGE_WINDOW_MS = USAGE_WINDOW_HOURS * 60 * 60 * 1000;

export interface UsageStatus {
  allowed: boolean;
  /** Messages remaining in the current window. */
  remaining: number;
  limit: number;
  /** When the window resets (ms epoch). */
  resetAt: number;
}

/**
 * Record one message against a user's rolling window and report whether it was
 * allowed. The window is fixed-length from the first message; once `limit` is
 * reached, further calls are rejected (and NOT counted) until it resets.
 */
export async function consumeMessage(
  userId: string,
  limit = FREE_MESSAGE_LIMIT
): Promise<UsageStatus> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  const now = Date.now();
  if (!user) {
    return { allowed: false, remaining: 0, limit, resetAt: now + USAGE_WINDOW_MS };
  }
  // Start a fresh window if none is active or the current one has elapsed.
  if (!user.usageWindowStart || now - user.usageWindowStart >= USAGE_WINDOW_MS) {
    user.usageWindowStart = now;
    user.usageCount = 0;
  }
  const resetAt = user.usageWindowStart + USAGE_WINDOW_MS;
  const used = user.usageCount ?? 0;
  if (used >= limit) {
    return { allowed: false, remaining: 0, limit, resetAt };
  }
  user.usageCount = used + 1;
  await writeDB(db);
  return { allowed: true, remaining: limit - user.usageCount, limit, resetAt };
}

/** Read usage without consuming (for showing remaining quota). */
export async function peekUsage(
  userId: string,
  limit = FREE_MESSAGE_LIMIT
): Promise<UsageStatus> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  const now = Date.now();
  if (!user || !user.usageWindowStart || now - user.usageWindowStart >= USAGE_WINDOW_MS) {
    return { allowed: true, remaining: limit, limit, resetAt: now + USAGE_WINDOW_MS };
  }
  const used = user.usageCount ?? 0;
  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
    resetAt: user.usageWindowStart + USAGE_WINDOW_MS,
  };
}

// ─── Personalization & memory ─────────────────────────────────

/** Read a user's memory + personalization (defaults applied). */
export async function getUserMemory(userId: string): Promise<UserMemory> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  return {
    memoryEnabled: user?.memoryEnabled ?? true,
    aboutYou: user?.aboutYou ?? "",
    responsePrefs: user?.responsePrefs ?? "",
    memories: user?.memories ?? [],
  };
}

/** Update personalization fields / the memory toggle. */
export async function updateUserMemory(
  userId: string,
  patch: { memoryEnabled?: boolean; aboutYou?: string; responsePrefs?: string }
): Promise<UserMemory> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new AuthError("User not found.");
  if (typeof patch.memoryEnabled === "boolean") user.memoryEnabled = patch.memoryEnabled;
  if (typeof patch.aboutYou === "string") user.aboutYou = patch.aboutYou.slice(0, 2000);
  if (typeof patch.responsePrefs === "string") user.responsePrefs = patch.responsePrefs.slice(0, 2000);
  await writeDB(db);
  return getUserMemory(userId);
}

/** Append a saved memory (de-duped, capped). Returns the updated list. */
export async function addMemory(userId: string, text: string): Promise<MemoryItem[]> {
  const clean = text.trim().slice(0, 400);
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user || !clean) return user?.memories ?? [];
  const existing = user.memories ?? [];
  // Skip near-duplicates (case-insensitive exact match).
  if (existing.some((m) => m.text.toLowerCase() === clean.toLowerCase())) return existing;
  const next = [
    ...existing,
    { id: randomBytes(8).toString("hex"), text: clean, createdAt: Date.now() },
  ].slice(-MEMORY_LIMIT);
  user.memories = next;
  await writeDB(db);
  return next;
}

/** Delete one memory (by id) or all (id omitted). Returns the remaining list. */
export async function deleteMemory(userId: string, id?: string): Promise<MemoryItem[]> {
  const db = await readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return [];
  user.memories = id ? (user.memories ?? []).filter((m) => m.id !== id) : [];
  await writeDB(db);
  return user.memories;
}

/** Build the system-prompt block describing the user, or "" if nothing/disabled. */
export async function buildMemoryContext(userId: string): Promise<string> {
  const mem = await getUserMemory(userId);
  if (!mem.memoryEnabled) return "";
  const parts: string[] = [];
  if (mem.aboutYou.trim()) parts.push(`About the user:\n${mem.aboutYou.trim()}`);
  if (mem.responsePrefs.trim()) parts.push(`How the user wants you to respond:\n${mem.responsePrefs.trim()}`);
  if (mem.memories.length) {
    parts.push(
      "Things you remember about the user:\n" +
        mem.memories.map((m) => `- ${m.text}`).join("\n")
    );
  }
  if (!parts.length) return "";
  return (
    "The following is saved context about the user you are talking to. Use it to " +
    "personalise your answers when relevant; do not recite it back unprompted.\n\n" +
    parts.join("\n\n")
  );
}

// ─── Google / OAuth ───────────────────────────────────────────

interface GoogleProfile {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Create or update a user from a verified Google sign-in.
 *
 * Logic:
 *   1. If a user with this googleId already exists → update + return them.
 *   2. If a user with the same email exists (created with email/password) →
 *      link the Google identity to that account.
 *   3. Otherwise → create a brand-new account (no password, pre-verified).
 *
 * In all cases the account is marked emailVerified = true (Google already
 * verified it) and a session token is issued immediately.
 */
export async function upsertGoogleUser(
  profile: GoogleProfile
): Promise<{ user: User; token: string }> {
  const db = await readDB();

  // Try to find an existing account linked to this Google UID first,
  // then fall back to email (to link existing email/password accounts).
  let user = db.users.find((u) => u.googleId === profile.googleId);
  if (!user) user = db.users.find((u) => u.email === profile.email);

  if (user) {
    // Link / refresh the Google identity.
    user.googleId = profile.googleId;
    if (profile.picture) user.googlePicture = profile.picture;
    user.emailVerified = true;
    // Update display name only if we don't already have one.
    if (!user.name && profile.name) user.name = profile.name;
  } else {
    // New account via Google — no password needed.
    user = {
      id:            randomBytes(9).toString("hex"),
      name:          profile.name ?? profile.email.split("@")[0],
      email:         profile.email,
      plan:          "free",
      onboarded:     false,
      createdAt:     Date.now(),
      emailVerified: true,
      credits:       0,
      passwordHash:  "", // OAuth-only; can set a password later
      googleId:      profile.googleId,
      googlePicture: profile.picture,
    };
    db.users.push(user);
  }

  await writeDB(db);
  return { user: publicUser(user), token: createSessionToken(user.id) };
}
