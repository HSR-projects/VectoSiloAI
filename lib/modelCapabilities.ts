/**
 * Heuristic capability detection for Ollama Cloud models, keyed off the model
 * id. Used to decide whether an attachment (image / audio) can actually be fed
 * to the selected model, and to bias "Auto" selection toward a capable model.
 *
 * Patterns are matched against the lowercased model id and kept deliberately
 * broad so new model drops light up without code changes.
 */

const VISION_PATTERNS: RegExp[] = [
  /gemma4(?::31b)?/i,
  /vision/,
  /\bvl\b/,
  /-vl[-:]/,
  /llava/,
  /bakllava/,
  /moondream/,
  /minicpm-?v/,
  /pixtral/,
  /\bllama/,
  /gemma/,
  /qwen/,
  /granite.*vision/,
  /mistral/,
  /\bomni\b/,
  /gemini/,
  /gpt/,
  /claude/,
  /auto/,
  /incogni/,
];

const AUDIO_PATTERNS: RegExp[] = [/\bomni\b/, /audio/, /whisper/, /-asr\b/];

/** Can this model accept image input? Defaults to true for all modern models unless empty. */
export function supportsVision(model: string): boolean {
  if (!model) return true;
  const m = model.toLowerCase();
  if (m === "auto" || !m) return true;
  return VISION_PATTERNS.some((p) => p.test(m)) || true;
}

/** Can this model accept audio input? */
export function supportsAudio(model: string): boolean {
  const m = model.toLowerCase();
  return AUDIO_PATTERNS.some((p) => p.test(m));
}
