/**
 * Parses the Doc builder output out of the streaming text.
 *
 * The model emits, as the very first characters, `[[doc:Title]]`, then the
 * document body wrapped in a single `<vectosilo-doc>…</vectosilo-doc>` block containing
 * raw Markdown. We stream the body as it arrives (even before the closing tag)
 * so the preview fills in live. Unlike code files, the body is NOT un-fenced —
 * Markdown legitimately contains ``` code fences.
 */

const DOC_DIRECTIVE_RE = /\[\[doc(?::\s*([^\]]*))?\]\]/i;
const DOC_BLOCK_RE = /<vectosilo-doc(?:\s+title=["']([^"']*)["'])?\s*>([\s\S]*?)<\/vectosilo-doc>/i;
const DOC_OPEN_RE = /<vectosilo-doc(?:\s+title=["']([^"']*)["'])?\s*>/i;

/** Detect the opening directive and document title. */
export function parseDocDirective(text: string): { title: string } | null {
  const m = text.match(DOC_DIRECTIVE_RE);
  if (!m) return null;
  return { title: (m[1] || "").trim() || "Document" };
}

/**
 * Extract the document body. Prefers a fully-closed block; otherwise streams
 * whatever has arrived after the opening tag so the preview fills in live.
 */
export function parseDocContent(text: string): string {
  const closed = text.match(DOC_BLOCK_RE);
  if (closed) return closed[2].replace(/^\r?\n/, "").replace(/\s+$/, "");
  const open = text.match(DOC_OPEN_RE);
  if (open && open.index != null) {
    return text.slice(open.index + open[0].length).replace(/^\r?\n/, "");
  }
  return "";
}

/** True if the stream contains (or is starting) a doc directive. */
export function hasDocSyntax(text: string): boolean {
  return DOC_DIRECTIVE_RE.test(text) || /<vectosilo-doc/i.test(text);
}

/** Remove all doc syntax (directive, block, partials) from visible text. */
export function stripDocSyntax(text: string): string {
  return text
    .replace(DOC_DIRECTIVE_RE, "")
    .replace(new RegExp(DOC_BLOCK_RE.source, "gi"), "")
    // Trailing unclosed block still streaming in.
    .replace(/<vectosilo-doc[\s\S]*$/i, "")
    .replace(/\[\[doc[^\]]*$/i, "")
    .replace(/^\s+/, "");
}
