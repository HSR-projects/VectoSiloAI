import { promises as dns } from "node:dns";

/**
 * Disposable / invalid email detection — four layers, evaluated in order:
 *
 *  1. Runtime blacklist  — domains confirmed bad this session (24 h TTL, instant).
 *  2. Community lists    — THREE different maintained repos, ALL merged together
 *                          so a domain only needs to be in one of them.
 *                          Extended hardcoded seed used when ALL fetches fail.
 *  3. Kickbox API        — free real-time disposable-detection API; catches
 *                          providers like hotkev.com that maintain valid MX
 *                          records and evade static lists.
 *  4. Live MX lookup     — fail-CLOSED: no confirmed MX → block + blacklist.
 */

// ── Constants ──────────────────────────────────────────────────────────────

const REFRESH_MS    = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT = 7_000;
const MX_TIMEOUT    = 5_000;
const API_TIMEOUT   = 4_000;

// ── Hardcoded seed (extended) ───────────────────────────────────────────────
// Used as a last resort when ALL remote blocklists fail.
// Also covers domains that maintain valid MX but are clearly disposable.

const SEED_FALLBACK = new Set<string>([
  // Classic disposable services
  "mailinator.com", "guerrillamail.com", "guerrillamailblock.com",
  "guerrillamail.info", "guerrillamail.biz", "guerrillamail.de",
  "grr.la", "sharklasers.com", "spam4.me", "yopmail.com", "yopmail.fr",
  "cool.fr.nf", "trashmail.com", "trashmail.me", "trashmail.net",
  "trashmail.at", "trashmail.io", "tempmail.com", "tempmail.net",
  "tempmail.org", "10minutemail.com", "10minutemail.net", "10minemail.com",
  "getnada.com", "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
  "mailnull.com", "spamcorpse.com", "spam.la", "dispostable.com",
  "disposablemail.com", "throwam.com", "throwaway.email", "nospam.ze.tc",
  "getairmail.com", "filzmail.com", "txcct.com", "maildrop.cc",
  "spamfree24.org", "mailexpire.com", "fakeinbox.com", "fakemail.fr",
  "tempr.email", "burnermail.io", "throwmail.net", "discard.email",
  "tempm.com", "spambox.us", "boximail.com", "mailnesia.com",
  "nowmymail.com", "emailondeck.com", "anonbox.net", "emailfake.com",
  "mohmal.com", "spamthisplease.com", "spamhere.net", "notmailinator.com",
  "anonaddy.com", "simplelogin.io",
  // "Hot" / random-word disposable domains (valid MX, evade static lists)
  "hotkev.com", "hotmeet.com", "hotbox.com", "hottempmail.com",
  "inboxbear.com", "inboxkitten.com", "inboxproxy.com",
  "tempinbox.com", "tempinbox.net", "tempmail.plus",
  "tempmailaddress.com", "tmails.net", "tmail.com", "tmail.io",
  "mailtemp.net", "mailtemp.org", "mailtemp.info",
  "tmpmail.net", "tmpmail.org", "tmpmailaddress.com",
  "jetable.com", "jetable.fr.nf", "jetable.net", "jetable.org",
  "mailboxy.fun", "randomail.io", "moakt.com", "moakt.cc",
  "mt2015.com", "mt2016.com", "mt2017.com",
  "spamgrap.com", "inboxed.pw", "drdrb.com",
  "mailnew.com", "meltmail.com", "objectmail.com",
  "onewaymail.com", "owlpic.com", "pookmail.com",
  "powered.name", "prtnx.com", "rcpt.at",
  "rppkn.com", "rtrtr.com", "s0ny.net",
  "smellfear.com", "snakemail.com", "sofimail.com",
  "sofort-mail.de", "spam.su", "spaml.de",
  "spamoff.de", "spamstack.net", "spamstack.com",
  "spamthis.co.uk", "spoofmail.de", "superrito.com",
  "teleworm.com", "teleworm.us", "thecloudindex.com",
  "thrma.com", "tlpn.org", "toiea.com",
  "toomail.biz", "tradermail.info", "trash-mail.at",
  "trash-mail.com", "trashdevil.com", "trashemail.de",
  "trbvm.com", "trillianpro.com", "ttttt.ml",
  "turual.com", "twinmail.de", "tyldd.com",
  "uggsrock.com", "umail.net", "uroid.com",
  "vkcode.ru", "vomoto.com", "vpn.st",
  "walala.org", "wegwerfadresse.de", "wegwerfemail.com",
  "wegwerfmail.de", "wegwerfmail.net", "wegwerfmail.org",
  "wetrainbayarea.com", "wetrainbayarea.org", "wh4f.org",
  "whyspam.me", "willhackforfood.biz", "willselfdestruct.com",
  "winemaven.info", "wronghead.com", "wuzupmail.net",
  "www.e4ward.com", "www.mailinator.com", "wwwnew.eu",
  "xagloo.co", "xagloo.com", "xemaps.com",
  "xents.com", "xmaily.com", "xoxy.net",
  "xyzfree.net", "yapped.net", "yep.it",
  "yogamaven.com", "yopmail.gq", "yourdomain.com",
  "yuurok.com", "z1p.biz", "za.com",
  "zehnminutenmail.de", "zetmail.com", "zippymail.info",
  "zoaxe.com", "zoemail.net", "zoemail.org",
  "zomg.info", "zxcv.com", "zxcvbnm.com",
  // Testing / example domains — block these
  "example.com", "example.net", "example.org", "test.com", "test.net",
]);

// ── Community blocklist — ALL sources merged ────────────────────────────────
// Using THREE different maintained repos so coverage is additive.

const BLOCKLIST_SOURCES = [
  // Primary — largest list (~110 k domains)
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf",
  // Mirror of the same list (CDN fallback)
  "https://cdn.jsdelivr.net/gh/disposable-email-domains/disposable-email-domains@main/disposable_email_blocklist.conf",
  // Different repo — often catches what the above misses
  "https://raw.githubusercontent.com/martenson/disposable-email-domains/master/disposable_email_blocklist.conf",
  // Third repo — curated separately
  "https://raw.githubusercontent.com/wesbos/burner-email-providers/master/emails.txt",
];

let listCache: Set<string> | null = null;
let listCachedAt = 0;
let listInflight: Promise<Set<string>> | null = null;

async function fetchText(url: string): Promise<string> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function parseDomainList(text: string): Set<string> {
  const set = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const raw = line.trim().toLowerCase();
    // Skip comments, blank lines, and JSON-ish lines
    if (!raw || raw.startsWith("#") || raw.startsWith("[") || raw.startsWith('"')) continue;
    // Some lists have "domain.com\r" or extra whitespace
    const d = raw.replace(/[",\[\]\s]/g, "");
    if (d.includes(".")) set.add(d);
  }
  return set;
}

/** Fetch ALL blocklist sources and merge them — partial failures are fine. */
async function getBlocklist(): Promise<Set<string>> {
  if (listCache && Date.now() - listCachedAt < REFRESH_MS) return listCache;
  if (listInflight) return listInflight;

  listInflight = (async () => {
    // Start all fetches in parallel; collect whichever succeed.
    const results = await Promise.allSettled(
      BLOCKLIST_SOURCES.map((url) => fetchText(url).then(parseDomainList))
    );

    const merged = new Set<string>(SEED_FALLBACK);
    let totalFromRemote = 0;

    for (const r of results) {
      if (r.status === "fulfilled") {
        for (const d of r.value) merged.add(d);
        totalFromRemote += r.value.size;
      }
    }

    // If we got nothing useful from remote, merged is just the seed — still valid.
    listCache    = merged;
    listCachedAt = Date.now();
    return merged;
  })();

  try   { return await listInflight; }
  finally { listInflight = null; }
}

function listedDisposable(domain: string, list: Set<string>): boolean {
  if (list.has(domain)) return true;
  // Catch subdomains: "x.mailinator.com" → check "mailinator.com"
  const parts = domain.split(".");
  for (let i = 1; i < parts.length - 1; i++) {
    if (list.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

// ── Kickbox real-time API ──────────────────────────────────────────────────
// Free, no auth needed. Catches disposable providers that maintain valid MX.
// Results cached 24 h per domain.

interface KickboxCache { disposable: boolean; at: number }
const kickboxCache = new Map<string, KickboxCache>();
const KICKBOX_TTL  = 24 * 60 * 60 * 1000;

async function isDisposableViaApi(domain: string): Promise<boolean | null> {
  const cached = kickboxCache.get(domain);
  if (cached && Date.now() - cached.at < KICKBOX_TTL) return cached.disposable;

  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT);
  try {
    const res = await fetch(
      `https://open.kickbox.com/v1/disposable/${encodeURIComponent(domain)}`,
      { signal: ctrl.signal }
    );
    if (!res.ok) return null; // API error → skip, don't block
    const json = await res.json() as { disposable?: boolean };
    const disposable = json.disposable === true;
    kickboxCache.set(domain, { disposable, at: Date.now() });
    return disposable;
  } catch {
    return null; // timeout / network error → skip
  } finally {
    clearTimeout(timer);
  }
}

// ── Runtime MX blacklist ───────────────────────────────────────────────────

const MX_BLACKLIST_TTL = 24 * 60 * 60 * 1000;
interface MxBlacklistEntry { blockedAt: number }
const mxBlacklist = new Map<string, MxBlacklistEntry>();

function isMxBlacklisted(domain: string): boolean {
  const e = mxBlacklist.get(domain);
  if (!e) return false;
  if (Date.now() - e.blockedAt > MX_BLACKLIST_TTL) { mxBlacklist.delete(domain); return false; }
  return true;
}

function addToMxBlacklist(domain: string) {
  mxBlacklist.set(domain, { blockedAt: Date.now() });
}

// ── MX lookup — FAIL-CLOSED ────────────────────────────────────────────────

function raceTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const mx = await raceTimeout(dns.resolveMx(domain), MX_TIMEOUT);
    if (mx.some((r) => r.exchange?.trim())) return true;
    return false; // empty MX array → no mail servers
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    // ENODATA/ENOTFOUND → domain has no MX; fall through to A-record check
    if (code !== "ENODATA" && code !== "ENOTFOUND" && code !== "ESERVFAIL") {
      return false; // timeout, ECONNREFUSED, etc. — fail closed
    }
  }
  // RFC 5321 §5.1: no MX → try A record as implicit mail host
  try {
    const a = await raceTimeout(dns.resolve4(domain), MX_TIMEOUT);
    return a.length > 0;
  } catch {
    return false;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export interface EmailCheck { ok: boolean; reason?: string }

/**
 * Four-layer domain validation — any layer failing blocks the registration.
 *
 *  1. Runtime MX blacklist (instant)
 *  2. Merged community blocklists (three different repos)
 *  3. Kickbox real-time disposable API (catches valid-MX throwaway providers)
 *  4. Live MX lookup, fail-closed
 */
export async function checkEmailDomain(email: string): Promise<EmailCheck> {
  const at = email.lastIndexOf("@");
  if (at < 0) return { ok: false, reason: "Enter a valid email." };
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain || !domain.includes(".")) return { ok: false, reason: "Enter a valid email." };

  // 1. Runtime blacklist
  if (isMxBlacklisted(domain)) {
    return { ok: false, reason: "That email domain can't receive mail. Use a different email address." };
  }

  // 2. Merged community blocklists
  try {
    const list = await getBlocklist();
    if (listedDisposable(domain, list)) {
      return { ok: false, reason: "Disposable email addresses aren't allowed. Use a permanent email." };
    }
  } catch { /* continue */ }

  // 3. Kickbox real-time API — runs in parallel with MX check
  const [kickboxResult, hasMx] = await Promise.all([
    isDisposableViaApi(domain),
    hasMxRecord(domain),
  ]);

  if (kickboxResult === true) {
    // Disposable confirmed by API → also blacklist so future checks are instant
    addToMxBlacklist(domain);
    return { ok: false, reason: "Disposable email addresses aren't allowed. Use a permanent email." };
  }

  // 4. MX check
  if (!hasMx) {
    addToMxBlacklist(domain);
    return { ok: false, reason: "That email domain can't receive mail. Use a different email address." };
  }

  return { ok: true };
}
