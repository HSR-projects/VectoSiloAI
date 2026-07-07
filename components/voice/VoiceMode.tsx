"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, X, Loader2, Volume2 } from "lucide-react";
import { useKodaStore } from "@/lib/store";
import { AUTO_MODEL } from "@/lib/autoModel";
import { speak as ttsSpeak, stopSpeaking } from "@/lib/tts";
import { sttSupported, recordUntilSilence, transcribe, abortRecording } from "@/lib/stt";
import { uid, cn } from "@/lib/utils";

type Step = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

interface SpeechRec {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: SpeechRecEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}
interface SpeechRecEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
type SpeechRecCtor = new () => SpeechRec;

function getRec(): SpeechRecCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceMode() {
  const open = useKodaStore((s) => s.voiceOpen);
  const setOpen = useKodaStore((s) => s.setVoiceOpen);
  const selectedModel = useKodaStore((s) => s.selectedModel);

  const [step, setStep] = useState<Step>("idle");
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [currentWordIdx, setCurrentWordIdx] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const activeRef = useRef(false);
  const replyWords = useRef<string[]>([]);
  const wordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset word highlight on new reply
  useEffect(() => {
    replyWords.current = reply ? reply.split(/\s+/) : [];
    setCurrentWordIdx(-1);
  }, [reply]);

  const clearWordTimer = useCallback(() => {
    if (wordTimerRef.current) {
      clearInterval(wordTimerRef.current);
      wordTimerRef.current = null;
    }
  }, []);

  // Word-highlight animation as TTS plays
  const animateWords = useCallback(async () => {
    const words = replyWords.current;
    if (!words.length) return;
    clearWordTimer();
    const totalMs = Math.min(words.length * 180, 30000);
    const perWord = totalMs / words.length;
    let idx = 0;
    setCurrentWordIdx(0);
    wordTimerRef.current = setInterval(() => {
      idx++;
      if (idx >= words.length) {
        clearWordTimer();
        setCurrentWordIdx(-1);
        return;
      }
      setCurrentWordIdx(idx);
    }, perWord);
  }, [clearWordTimer]);

  const speakReply = useCallback(async (text: string) => {
    setReply(text);
    setStep("speaking");
    animateWords();
    await ttsSpeak(text, {});
    clearWordTimer();
    setCurrentWordIdx(-1);
    if (activeRef.current) {
      setStep("idle");
    }
  }, [animateWords, clearWordTimer]);

  const ask = useCallback(async (text: string) => {
    stopSpeaking();
    clearWordTimer();
    setStep("thinking");
    setTranscript(text);
    setReply("");
    setCurrentWordIdx(-1);

    const store = useKodaStore.getState();
    let threadId = store.activeThreadId && store.getThread(store.activeThreadId)
      ? store.activeThreadId : store.createThread(text);

    const history = (store.getThread(threadId)?.messages ?? [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && m.content.trim())
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    const now = Date.now();
    const assistantId = uid();
    store.appendMessage(threadId, { id: uid(), role: "user", content: text, createdAt: now });
    store.appendMessage(threadId, {
      id: assistantId, role: "assistant", content: "", streaming: true, focusMode: "nosearch", createdAt: now + 1,
    });

    let answer = "";
    try {
      const model = selectedModel && selectedModel !== AUTO_MODEL ? selectedModel : undefined;
      const s = useKodaStore.getState();
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text, threadHistory: history, model, focusMode: "nosearch",
          provider: s.provider, providerApiKey: s.providerApiKey, providerBaseUrl: s.providerBaseUrl,
        }),
      });
      if (!res.ok || !res.body) throw new Error("Couldn't reach the model.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
          for (const line of chunk.split("\n")) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (!payload) continue;
            try {
              const ev = JSON.parse(payload);
              if (ev.type === "token") {
                answer += ev.content;
                setReply(answer);
                store.updateMessage(threadId, assistantId, { content: answer });
              } else if (ev.type === "error") throw new Error(ev.message);
            } catch { /* ignore */ }
          }
        }
      }
    } catch (e) {
      const msg = (e as Error).message || "Something went wrong.";
      store.updateMessage(threadId, assistantId, { streaming: false, error: msg });
      throw e;
    }

    store.updateMessage(threadId, assistantId, { streaming: false });
    if (!answer) return;

    await speakReply(answer);
  }, [selectedModel, speakReply, clearWordTimer]);

  const handleResult = useCallback(async (text: string) => {
    const t = text.trim();
    if (!t) return;
    await ask(t);
  }, [ask]);

  // ── Native (Chrome) STT ──
  const recRef = useRef<SpeechRec | null>(null);

  const startNative = useCallback(() => {
    const Ctor = getRec();
    if (!Ctor) { setError("Speech recognition not available in this browser."); return; }
    try { recRef.current?.abort(); } catch { /* noop */ }
    const rec = new Ctor();
    rec.lang = useKodaStore.getState().dictationLang || navigator.language || "en-US";
    rec.continuous = false;
    rec.interimResults = true;

    let finalText = "";
    rec.onresult = (e: SpeechRecEvent) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += t; else interim += t;
      }
      setTranscript((finalText + interim).trim());
    };
    rec.onerror = () => { /* handled by onend */ };
    rec.onend = () => {
      if (!activeRef.current) return;
      const said = finalText.trim();
      if (said) {
        handleResult(said);
      } else {
        if (activeRef.current) startNative();
      }
    };

    recRef.current = rec;
    setStep("listening");
    setTranscript("");
    try { rec.start(); } catch { /* noop */ }
  }, [handleResult]);

  const startLocal = useCallback(async () => {
    setStep("listening");
    setTranscript("");
    let audio: Float32Array | null = null;
    try {
      audio = await recordUntilSilence({ startTimeoutMs: 15000 });
    } catch {
      if (!activeRef.current) return;
      setError("Microphone access blocked. Allow the mic in browser settings.");
      return;
    }
    if (!activeRef.current) return;
    if (!audio) { if (activeRef.current) startLocal(); return; }
    setStep("transcribing");
    let text = "";
    try { text = (await transcribe(audio)).trim(); } catch { if (activeRef.current) startLocal(); return; }
    if (!activeRef.current) return;
    if (!text) { if (activeRef.current) startLocal(); return; }
    await handleResult(text);
  }, [handleResult]);

  const begin = useCallback(() => {
    const secure = typeof window !== "undefined" && (window.isSecureContext ?? false);
    if (!secure) { setError("Voice needs HTTPS. Type below, replies are spoken."); return; }
    if (sttSupported() && !getRec()) {
      startLocal();
    } else if (getRec()) {
      startNative();
    } else {
      setError("Voice input not available in this browser.");
    }
  }, [startNative, startLocal]);

  useEffect(() => {
    if (open) {
      activeRef.current = true;
      setError(null);
      setReply("");
      setTranscript("");
      setCurrentWordIdx(-1);
      begin();
    } else {
      activeRef.current = false;
      try { recRef.current?.abort(); } catch { /* noop */ }
      abortRecording();
      stopSpeaking();
      clearWordTimer();
    }
    return () => {
      activeRef.current = false;
      try { recRef.current?.abort(); } catch { /* noop */ }
      abortRecording();
      stopSpeaking();
      clearWordTimer();
    };
  }, [open, begin, clearWordTimer]);

  const close = () => setOpen(false);

  const highlightClass = (idx: number) =>
    idx === currentWordIdx ? "text-koda-accent-soft font-semibold" : "text-koda-text/80";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl"
        >
          <button onClick={close} aria-label="Close"
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>

          {/* Status + button */}
          <div className="flex flex-col items-center gap-6">
            {/* Mic / loading circle */}
            <motion.div
              animate={step === "listening" || step === "speaking"
                ? { scale: [1, 1.06, 1] }
                : { scale: 1 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-28 w-28 items-center justify-center rounded-full"
              style={{
                background: step === "speaking"
                  ? "radial-gradient(circle at 50% 50%, #a78bfa, #7c3aed)"
                  : "radial-gradient(circle at 50% 50%, #ffffff, #e5e5e5)",
                boxShadow: step === "speaking"
                  ? "0 0 60px 15px rgba(124,58,237,0.4)"
                  : "0 0 40px 10px rgba(255,255,255,0.15)",
              }}
            >
              {step === "thinking" || step === "transcribing" ? (
                <Loader2 className="h-10 w-10 animate-spin text-black" />
              ) : step === "speaking" ? (
                <Volume2 className="h-11 w-11 animate-pulse text-white" />
              ) : (
                <Mic className={cn("h-11 w-11", step === "listening" ? "text-black" : "text-gray-600")} />
              )}
            </motion.div>

            {/* Label */}
            <p className="text-sm font-medium uppercase tracking-widest text-white/70">
              {step === "idle" && "Tap to speak"}
              {step === "listening" && "Listening…"}
              {step === "transcribing" && "Transcribing…"}
              {step === "thinking" && "Thinking…"}
              {step === "speaking" && "Speaking…"}
            </p>
          </div>

          {/* Transcript / Reply */}
          <div className="mt-10 w-full max-w-xl px-8 text-center">
            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : step === "speaking" && reply ? (
              <p className="text-lg leading-relaxed text-white/80">
                {reply.split(/\s+/).map((word, i) => (
                  <span key={i} className={cn("transition-colors duration-150", highlightClass(i))}>
                    {word}{" "}
                  </span>
                ))}
              </p>
            ) : step === "thinking" || step === "transcribing" ? (
              <p className="line-clamp-4 text-lg text-white/60">{reply || "…"}</p>
            ) : (
              <p className="text-xl text-white/90">{transcript || ""}</p>
            )}
          </div>

          {/* Bottom hint */}
          {error && (
            <div className="mt-6 flex gap-3">
              <button onClick={() => { setError(null); begin(); }}
                className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-white/90">
                Retry
              </button>
              <button onClick={close}
                className="rounded-full border border-white/20 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                Cancel
              </button>
            </div>
          )}

          <p className="absolute bottom-10 px-6 text-center text-xs text-white/40">
            {step === "listening" ? "I'm listening — speak clearly." : step === "speaking" ? "Listen to the response." : ""}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
