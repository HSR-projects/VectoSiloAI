import type { ProjectFile } from "@/types";

/**
 * Parses the model's Incogni's Computer output out of the streaming text.
 *
 * The model emits, as the very first characters, `[[computer:Title]]`, then one
 * `<incogni-file path="...">…</incogni-file>` block per file and `<incogni-cmd>…</incogni-cmd>`
 * blocks for shell commands. We parse only fully-closed blocks so partial,
 * mid-stream tags never render or half-load.
 */

const DIRECTIVE_RE = /\[\[computer(?::\s*([^\]]*))?\]\]/i;
const WEBSITE_RE = /\[\[website(?::\s*([^\]]*))?\]\]/i;
const FILE_RE = /<incogni-file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/incogni-file>/gi;
const CMD_RE = /<incogni-cmd>\s*([\s\S]*?)<\/incogni-cmd>/gi;
const SCAFFOLD_RE = /\[\[scaffold(?::\s*([^\]]+))?\]\]/i;

/** Detect the Website builder directive (shares the <incogni-file> format). */
export function parseWebsiteDirective(text: string): { title: string } | null {
  const m = text.match(WEBSITE_RE);
  if (!m) return null;
  return { title: (m[1] || "").trim() || "Website" };
}

/** Remove the website directive (file blocks are stripped by stripComputerSyntax). */
export function stripWebsiteSyntax(text: string): string {
  return text.replace(WEBSITE_RE, "").replace(/\[\[website[^\]]*$/i, "");
}

/** Detect the opening directive and project title. */
export function parseComputerDirective(text: string): { title: string } | null {
  const m = text.match(DIRECTIVE_RE);
  if (!m) return null;
  const title = (m[1] || "").trim();
  return { title: title || "Project" };
}

function cleanContent(raw: string): string {
  // Strip a single leading newline (right after the tag) and trailing space.
  let c = raw.replace(/^\r?\n/, "").replace(/[ \t]+$/g, "");
  // Models sometimes wrap file bodies in a code fence — peel it off.
  const fence = c.match(/^```[a-z0-9]*\r?\n([\s\S]*?)\r?\n?```$/i);
  if (fence) c = fence[1];
  return c.replace(/\s+$/, "");
}

/** Extract every completed file block, de-duped by path (last write wins). */
export function parseComputerFiles(text: string): ProjectFile[] {
  const re = new RegExp(FILE_RE.source, FILE_RE.flags);
  const byPath = new Map<string, string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const path = m[1].trim().replace(/^\.?\/+/, "");
    if (path) byPath.set(path, cleanContent(m[2]));
  }
  return [...byPath.entries()].map(([path, content]) => ({ path, content }));
}

/** Extract every completed command, in order. */
export function parseComputerCommands(text: string): string[] {
  const re = new RegExp(CMD_RE.source, CMD_RE.flags);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const cmd = m[1].trim();
    if (cmd) out.push(cmd);
  }
  return out;
}

/** True if the stream contains (or is starting) a computer directive. */
export function hasComputerSyntax(text: string): boolean {
  return DIRECTIVE_RE.test(text) || /<incogni-file|<incogni-cmd/i.test(text);
}

/** Remove all computer syntax (directive, file/cmd blocks, partials) from visible text. */
export function stripComputerSyntax(text: string): string {
  return text
    .replace(DIRECTIVE_RE, "")
    .replace(new RegExp(FILE_RE.source, "gi"), "")
    .replace(new RegExp(CMD_RE.source, "gi"), "")
    // Trailing unclosed blocks still streaming in.
    .replace(/<incogni-file[\s\S]*$/i, "")
    .replace(/<incogni-cmd[\s\S]*$/i, "")
    .replace(/\[\[computer[^\]]*$/i, "")
    .replace(/\[\[scaffold[^\]]*$/i, "")
    .replace(/^\s+/, "");
}

/** Detect the scaffold directive (AI references a template to auto-build). */
export function parseScaffoldDirective(text: string): { id: string; title?: string } | null {
  const m = text.match(SCAFFOLD_RE);
  if (!m) return null;
  const full = (m[1] || "").trim();
  if (!full) return null;
  const parts = full.split(":");
  return {
    id: parts[0].trim(),
    title: parts[1]?.trim() || undefined,
  };
}

/** Remove scaffold directive from visible text. */
export function stripScaffoldSyntax(text: string): string {
  return text.replace(SCAFFOLD_RE, "").replace(/\[\[scaffold[^\]]*$/i, "");
}
