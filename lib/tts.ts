/**
 * Text-to-speech for "Read aloud" and Voice mode.
 * Uses the local Piper TTS engine (/api/tts) for natural neural voices,
 * and falls back to the browser's built-in speechSynthesis when unavailable.
 * Only one utterance plays at a time.
 */

let currentAudio: HTMLAudioElement | null = null;
let usingSynthesis = false;

export interface SpeakHandlers {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

/** Strip markdown / artifact syntax so the spoken text sounds natural. */
export function cleanForSpeech(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " (code block) ")
    .replace(/<koda-file[^>]*>[\s\S]*?<\/koda-file>/gi, " ")
    .replace(/\[\[[^\]]*\]\]/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>~|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

export function stopSpeaking(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.src = "";
    } catch {
      /* noop */
    }
    currentAudio = null;
  }
  if (usingSynthesis && typeof window !== "undefined") {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
    usingSynthesis = false;
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && ("speechSynthesis" in window || true);
}

/**
 * Speak the given text. Resolves when playback finishes (or is stopped).
 * Tries Piper TTS (/api/tts) first; falls back to browser speechSynthesis.
 */
export async function speak(text: string, handlers: SpeakHandlers = {}): Promise<void> {
  const content = cleanForSpeech(text);
  if (!content) return;

  stopSpeaking();

  // 1) Try Piper neural TTS via our API route.
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: content }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudio = audio;
      handlers.onStart?.();
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          currentAudio = null;
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          currentAudio = null;
          resolve();
        };
        audio.play().catch(() => {
          URL.revokeObjectURL(url);
          currentAudio = null;
          resolve();
        });
      });
      handlers.onEnd?.();
      return;
    }
  } catch {
    /* fall through to browser synthesis */
  }

  // 2) Fallback: browser speechSynthesis.
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(content);
      u.rate = 1.02;
      u.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /natural|google|samantha|aria/i.test(v.name)) ??
        voices.find((v) => v.lang?.startsWith("en"));
      if (preferred) u.voice = preferred;
      u.onstart = () => handlers.onStart?.();
      u.onend = () => { usingSynthesis = false; handlers.onEnd?.(); resolve(); };
      u.onerror = () => { usingSynthesis = false; handlers.onEnd?.(); resolve(); };
      usingSynthesis = true;
      window.speechSynthesis.speak(u);
    });
    return;
  }

  handlers.onError?.("Speech is not supported in this browser.");
}
