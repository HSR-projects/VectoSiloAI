/**
 * Bad-word / harmful-content filter.
 * Pre-screens user queries before they reach the AI model.
 */

// Core word list — matched as whole words (word boundaries), case-insensitive.
// Leet-speak variants are normalised before matching.
const BAD_WORDS: string[] = [
  // Profanity
  "fuck", "fucker", "fucking", "fucked", "fucks",
  "shit", "shitting", "shitted", "shits",
  "bitch", "bitches", "bitching",
  "bastard", "bastards",
  "asshole", "assholes", "asshat",
  "cunt", "cunts",
  "cock", "cocks", "cocksucker",
  "dick", "dicks", "dickhead",
  "pussy", "pussies",
  "motherfucker", "motherfucking",
  "whore", "whores",
  "slut", "sluts",
  "prick", "pricks",
  "twat", "twats",
  "wanker", "wankers",
  "bollocks",
  "faggot", "faggots",
  "nigger", "niggers", "nigga",
  "spic", "spics",
  "kike", "kikes",
  "chink", "chinks",
  "wetback",
  "retard", "retarded", "retards",
  "tranny", "trannies",
  // Harmful intent
  "how to make a bomb",
  "how to build a bomb",
  "how to kill",
  "how to murder",
  "how to rape",
  "how to hack",
  "bomb making",
  "child porn",
  "cp porn",
  "lolicon",
  "snuff",
];

// Leet-speak substitution map applied before matching.
const LEET: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
  "!": "i",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[013457@$!]/g, (c) => LEET[c] ?? c)
    // Collapse repeated characters: "fuuuuck" → "fuck"
    .replace(/(.)\1{2,}/g, "$1$1")
    // Strip zero-width / invisible characters
    .replace(/[​-‏‪-‮⁠-⁤﻿]/g, "");
}

// Pre-compile regexes once.
const PATTERNS: RegExp[] = BAD_WORDS.map((w) => {
  // Phrases (contain spaces) — simple substring match after normalising.
  if (w.includes(" ")) return new RegExp(w.replace(/ /g, "\\s+"), "i");
  // Single words — word-boundary match so "classic" doesn't trigger "ass".
  return new RegExp(`\\b${w}\\b`, "i");
});

export interface ContentCheck {
  ok: boolean;
  /** The matched word/phrase that triggered the block (for logging). */
  matched?: string;
}

/**
 * Returns `{ ok: false }` if the text contains a bad word or harmful phrase.
 * Fast — no network calls, purely in-process.
 */
export function checkContent(text: string): ContentCheck {
  const norm = normalize(text);
  for (let i = 0; i < PATTERNS.length; i++) {
    if (PATTERNS[i].test(norm)) {
      return { ok: false, matched: BAD_WORDS[i] };
    }
  }
  return { ok: true };
}
