"use client";

import { useEffect, useRef, useState } from "react";
import { Square, Mic, Loader2 } from "lucide-react";

interface Props {
  onRecorded: (blob: Blob, duration: number, transcript: string) => void;
  onCancel: () => void;
}

const SILENCE_MS = 1500;
const MAX_MS = 30000;

export function VoiceRecorder({ onRecorded, onCancel }: Props) {
  const [transcript, setTranscript] = useState("");
  const [duration, setDuration] = useState(0);
  const [silent, setSilent] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const activeRef = useRef(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const lastVoiceRef = useRef(performance.now());
  const silenceTimerRef = useRef<ReturnType<typeof setInterval>>();
  const transcriptRef = useRef("");

  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current = true;
    startCapture();
    return () => {
      activeRef.current = false;
      clearInterval(timerRef.current);
      clearInterval(silenceTimerRef.current);
      cancelAnimationFrame(rafRef.current);
      closeAudio();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try { recorderRef.current?.stop(); } catch { /* noop */ }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeAudio = () => {
    cancelAnimationFrame(rafRef.current);
    const ac = audioCtxRef.current;
    if (ac && ac.state !== "closed") {
      ac.close().catch(() => {});
    }
    audioCtxRef.current = null;
  };

  const drawWaveform = () => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas || !activeRef.current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(167, 139, 250, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = silent ? "#f87171" : "#a78bfa";
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
    rafRef.current = requestAnimationFrame(drawWaveform);
  };

  const detectSilence = () => {
    const analyser = analyserRef.current;
    if (!analyser || !activeRef.current) return;
    const dataArray = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0 - 1;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / dataArray.length);

    const now = performance.now();
    if (rms > 0.02) {
      lastVoiceRef.current = now;
      if (silent) setSilent(false);
    } else if (now - lastVoiceRef.current > SILENCE_MS) {
      if (!silent) setSilent(true);
      if (now - lastVoiceRef.current > SILENCE_MS + 500) {
        finishRecording();
      }
    }
  };

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!activeRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;

      // Audio analysis for waveform + VAD
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ac = new AudioCtx();
      audioCtxRef.current = ac;
      const source = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawWaveform();
      silenceTimerRef.current = setInterval(detectSilence, 200);

      // MediaRecorder for the audio blob (start immediately)
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.start();

      // Browser SpeechRecognition for live transcription
      // Use the global types
      const SR = (window as unknown as {
        SpeechRecognition?: new () => {
          lang: string; continuous: boolean; interimResults: boolean;
          start: () => void; stop: () => void;
          onresult: ((e: { results: SpeechRecognitionResultList; resultIndex: number }) => void) | null;
          onerror: ((e: { error?: string }) => void) | null;
          onend: (() => void) | null;
        };
        webkitSpeechRecognition?: new () => {
          lang: string; continuous: boolean; interimResults: boolean;
          start: () => void; stop: () => void;
          onresult: ((e: { results: SpeechRecognitionResultList; resultIndex: number }) => void) | null;
          onerror: ((e: { error?: string }) => void) | null;
          onend: (() => void) | null;
        };
      }).SpeechRecognition ?? (window as unknown as {
        webkitSpeechRecognition?: new () => {
          lang: string; continuous: boolean; interimResults: boolean;
          start: () => void; stop: () => void;
          onresult: ((e: { results: SpeechRecognitionResultList; resultIndex: number }) => void) | null;
          onerror: ((e: { error?: string }) => void) | null;
          onend: (() => void) | null;
        };
      }).webkitSpeechRecognition;

      if (SR && (window.isSecureContext ?? false)) {
        try {
          const rec = new SR();
          rec.lang = "en-US";
          rec.continuous = true;
          rec.interimResults = true;

          rec.onresult = (e) => {
            let final = "";
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const r = e.results[i];
              const t = r[0]?.transcript ?? "";
              if (r.isFinal) final += t; else interim += t;
            }
            if (final) {
              transcriptRef.current = (transcriptRef.current + " " + final).trim();
            }
            const full = transcriptRef.current + (interim ? " " + interim : "");
            setTranscript(full);
          };

          rec.onerror = () => {
            // SpeechRecognition failed — transcript will use server fallback in finishRecording
          };

          rec.start();
        } catch {
          // SR failed to start — transcript stays as whatever we got
        }
      }

      startRef.current = Date.now();
      lastVoiceRef.current = performance.now();
      timerRef.current = setInterval(() => {
        const d = Math.floor((Date.now() - startRef.current) / 1000);
        setDuration(d);
        if (d >= MAX_MS / 1000) finishRecording();
      }, 200);
    } catch {
      if (activeRef.current) onCancel();
    }
  };

  const finishRecording = () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearInterval(timerRef.current);
    clearInterval(silenceTimerRef.current);
    closeAudio();

    let text = transcriptRef.current.trim();

    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      onCancel();
      return;
    }

    const dur = Math.max(1, startRef.current ? Math.floor((Date.now() - startRef.current) / 1000) : 0);

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });

      // If browser SpeechRecognition gave us nothing, fall back to server STT
      if (!text) {
        setTranscript("Transcribing…");
        try {
          const controller = new AbortController();
          const to = setTimeout(() => controller.abort(), 8000);
          const res = await fetch("/api/stt", {
            method: "POST",
            headers: { "Content-Type": blob.type || "audio/webm" },
            body: blob,
            signal: controller.signal,
          });
          clearTimeout(to);
          if (res.ok) {
            const data = await res.json() as { text?: string };
            text = (data.text ?? "").trim();
          }
        } catch {
          // STT fallback failed too
        }
      }

      onRecorded(blob, dur, text);
    };
    try { recorder.stop(); } catch { onCancel(); }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-incogni-border bg-incogni-surface px-4 py-3">
      <button
        onClick={finishRecording}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
      >
        <Square className="h-3.5 w-3.5 fill-current" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="h-10">
          <canvas
            ref={canvasRef}
            width={300}
            height={40}
            className="h-full w-full rounded"
          />
        </div>
        <div ref={textRef} className="mt-0.5 min-h-[1em]">
          {transcript && (
            <p className="truncate text-xs text-incogni-accent-soft font-medium">{transcript}</p>
          )}
        </div>
      </div>

      <span className="shrink-0 text-xs tabular-nums text-incogni-muted">
        {silent ? "done?" : fmt(duration)}
      </span>
    </div>
  );
}
