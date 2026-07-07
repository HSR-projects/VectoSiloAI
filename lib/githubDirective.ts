/**
 * Parses the GitHub action directive out of the model's reply (client-safe — no
 * Node imports). The model emits, as the FIRST characters of its reply:
 *
 *   [[github:action_name]]
 *   ```json
 *   { ...arguments... }
 *   ```
 *
 * then a short friendly sentence. We run the action after the stream completes,
 * so the JSON fence is always closed by the time we parse it. Using a fenced
 * JSON block (rather than inline args) keeps file contents with braces/brackets
 * from breaking the parse.
 */

const GH_DIR_RE = /\[\[github:([a-z_]+)\]\]/i;
const GH_FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/i;

export interface GithubDirective {
  action: string;
  args: Record<string, unknown>;
}

export function parseGithubDirective(text: string): GithubDirective | null {
  const m = text.match(GH_DIR_RE);
  if (!m || m.index == null) return null;
  const action = m[1].toLowerCase();
  let args: Record<string, unknown> = {};
  const after = text.slice(m.index + m[0].length);
  const fence = after.match(GH_FENCE_RE);
  if (fence) {
    try {
      const parsed = JSON.parse(fence[1].trim());
      if (parsed && typeof parsed === "object") args = parsed as Record<string, unknown>;
    } catch {
      /* leave args empty — the action route validates */
    }
  }
  return { action, args };
}

export function hasGithubSyntax(text: string): boolean {
  return /\[\[github:/i.test(text);
}

/** Remove the directive + its JSON fence (and any partial) from visible text. */
export function stripGithubSyntax(text: string): string {
  return text
    // Directive followed by a closed JSON fence.
    .replace(/\[\[github:[a-z_]+\]\]\s*```(?:json)?[\s\S]*?```/gi, "")
    // Directive with a still-streaming (unclosed) fence — drop the rest.
    .replace(/\[\[github:[a-z_]+\]\][\s\S]*$/i, "")
    // Bare/partial directive token.
    .replace(/\[\[github[^\]]*$/i, "")
    .replace(/^\s+/, "");
}
