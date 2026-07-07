/**
 * Parses the auto-memory directive out of the model's reply (client-safe).
 * The model emits `[[memory: a concise durable fact]]` anywhere in its answer;
 * the client saves each one and strips them from the visible text.
 */

const MEMORY_RE = /\[\[memory:\s*([\s\S]+?)\]\]/i;

/** Extract every completed memory fact, in order. */
export function parseMemoryDirectives(text: string): string[] {
  const re = new RegExp(MEMORY_RE.source, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const fact = m[1].trim();
    if (fact) out.push(fact);
  }
  return out;
}

/** Remove all memory directives (and any partial trailing one) from visible text. */
export function stripMemorySyntax(text: string): string {
  return text
    .replace(new RegExp(MEMORY_RE.source, "gi"), "")
    .replace(/\[\[memory:[\s\S]*$/i, "");
}
