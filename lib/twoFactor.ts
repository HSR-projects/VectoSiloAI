import { randomBytes, createCipheriv, createDecipheriv, createHash, createHmac } from "node:crypto";
import bcrypt from "bcrypt";
import QRCode from "qrcode";

const AUTH_SECRET = process.env.AUTH_SECRET || "koda-dev-secret-change-me-in-production";
const TWO_FACTOR_TOKEN_TTL = 1000 * 60 * 5; // 5 minutes
const BACKUP_CODE_COUNT = 8;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = "";
  for (const byte of buf) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let i = 0; i + 4 < bits.length; i += 5) {
    result += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return result;
}

function base32Decode(str: string): Buffer {
  const cleaned = str.replace(/=+$/, "").toUpperCase();
  const bits: number[] = [];
  for (const ch of cleaned) {
    const val = BASE32_ALPHABET.indexOf(ch);
    if (val === -1) continue;
    for (let i = 4; i >= 0; i--) bits.push((val >> i) & 1);
  }
  const bytes: number[] = [];
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}

function totpCode(secret: string, timeMs = Date.now()): string {
  const counter = Math.floor(timeMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(binary % 1000000).padStart(6, "0");
}

/**
 * Generate a new TOTP secret (base32 encoded, suitable for Google/Microsoft Authenticator).
 */
export function generateTwoFactorSecret(): string {
  return base32Encode(randomBytes(20));
}

/**
 * Build an otpauth:// URL for the QR code.
 */
export function getOTPAuthURL(secret: string, email: string): string {
  const encoded = encodeURIComponent(email);
  return `otpauth://totp/KodaAI:${encoded}?secret=${secret}&issuer=KodaAI`;
}

/**
 * Generate a QR code data URL (base64 PNG) from an otpauth:// URL.
 */
export async function generateQRCodeDataURL(otpauthURL: string): Promise<string> {
  return QRCode.toDataURL(otpauthURL, { width: 256, margin: 2 });
}

/**
 * Verify a TOTP code against the secret with a ±step window
 * (accounts for minor clock drift between server and authenticator app).
 */
export function verifyTOTPCode(secret: string, code: string, window = 1): boolean {
  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) return false;
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    if (totpCode(secret, now + i * 30000) === code) return true;
  }
  return false;
}

/**
 * Encrypt a TOTP secret for storage using AES-256-GCM.
 * Returns "iv:authTag:ciphertext" (all base64).
 */
export function encryptSecret(secret: string): string {
  const key = deriveEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(secret, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");
  return `${iv.toString("base64")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a TOTP secret stored as "iv:authTag:ciphertext" (all base64).
 */
export function decryptSecret(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted secret format");
  const [ivB64, authTagB64, dataB64] = parts;
  const key = deriveEncryptionKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  let decrypted = decipher.update(dataB64, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Generate backup codes (8 random 10-character alphanumeric codes).
 * Returns both the plaintext codes (to show the user) and their bcrypt hashes (to store).
 */
export function generateBackupCodes(): { plain: string[]; hashes: string[] } {
  const plain: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = randomBytes(6)
      .toString("base64url")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 10)
      .toUpperCase();
    plain.push(code);
    hashes.push(bcrypt.hashSync(code, 8));
  }
  return { plain, hashes };
}

/**
 * Verify a backup code against a list of bcrypt-hashed backup codes.
 * If verified, the used hash is removed from the list (one-time use).
 * Returns { ok: boolean, remainingHashes: string[] }.
 */
export function verifyBackupCode(code: string, storedHashes: string[]): { ok: boolean; remainingHashes: string[] } {
  const trimmed = code.trim().toUpperCase();
  for (let i = 0; i < storedHashes.length; i++) {
    if (bcrypt.compareSync(trimmed, storedHashes[i])) {
      const remaining = [...storedHashes];
      remaining.splice(i, 1);
      return { ok: true, remainingHashes: remaining };
    }
  }
  return { ok: false, remainingHashes: storedHashes };
}

/**
 * Create a short-lived 2FA challenge token (HMAC-signed, 5 min TTL).
 * The payload contains only the user ID.
 */
export function createTwoFactorToken(userId: string): string {
  const body = JSON.stringify({ uid: userId, exp: Date.now() + TWO_FACTOR_TOKEN_TTL });
  const payload = Buffer.from(body).toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/**
 * Verify a 2FA challenge token. Returns the user ID if valid, null otherwise.
 */
export function verifyTwoFactorToken(token: string): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expectedSig = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  if (sig !== expectedSig) return null;
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

function deriveEncryptionKey(): Buffer {
  return createHash("sha256").update(AUTH_SECRET).digest();
}
