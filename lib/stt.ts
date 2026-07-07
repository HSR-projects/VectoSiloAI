/**
 * Speech-to-text using faster-whisper running server-side.
 * Audio is recorded in the browser and sent to /api/stt, which proxies to
 * the persistent Python STT server (127.0.0.1:5050). VAD filtering on the
 * server side suppresses background voices and noise.
 */

export function sttSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined" &&
    (window.isSecureContext ?? false)
  );
}

/** No-op — model stays loaded in the Python server process. */
export function preloadStt(): void {}

let currentAbort: (() => void) | null = null;

/** Cancel any in-progress {@link recordUntilSilence}. */
export function abortRecording(): void {
  currentAbort?.();
}

export interface VadOptions {
  silenceMs?: number;
  maxMs?: number;
  startTimeoutMs?: number;
  threshold?: number;
}

/**
 * Record from the mic until the speaker pauses, then transcribe via
 * the server-side faster-whisper engine.
 * Returns the transcript string, or null if nothing was said.
 */
export async function recordUntilSilence(opts: VadOptions = {}): Promise<Float32Array | null> {
  // We still return a Float32Array sentinel so VoiceMode.tsx can call transcribe().
  // The actual blob is stored in _lastBlob for transcribe() to pick up.
  const { silenceMs = 1000, maxMs = 15000, startTimeoutMs = 9000, threshold = 0.015 } = opts;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AudioCtx();
  const source = ac.createMediaStreamSource(stream);
  const analyser = ac.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const data = new Float32Array(analyser.fftSize);

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start();

  return await new Promise<Float32Array | null>((resolve) => {
    let started = false;
    let lastVoice = performance.now();
    const t0 = lastVoice;
    let raf = 0;
    let done = false;

    const finish = (produce: boolean) => {
      if (done) return;
      done = true;
      currentAbort = null;
      cancelAnimationFrame(raf);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        try { await ac.close(); } catch { /* noop */ }
        if (!produce) { resolve(null); return; }
        // Store the blob for transcribe() to send to the server
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        _lastBlob = blob;
        // Return a non-null sentinel so the caller knows to call transcribe()
        resolve(new Float32Array(1));
      };
      try { recorder.stop(); } catch { resolve(produce ? new Float32Array(1) : null); }
    };

    currentAbort = () => finish(false);

    const tick = () => {
      analyser.getFloatTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const rms = Math.sqrt(sum / data.length);
      const now = performance.now();
      if (rms > threshold) { started = true; lastVoice = now; }

      if (!started && now - t0 > startTimeoutMs) return finish(false);
      if (started && now - lastVoice > silenceMs) return finish(true);
      if (now - t0 > maxMs) return finish(started);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}

// Blob passed from recordUntilSilence → transcribe
let _lastBlob: Blob | null = null;

/**
 * Send the last recorded audio blob to /api/stt (faster-whisper server-side).
 * VoiceMode calls this immediately after recordUntilSilence resolves.
 */
export async function transcribe(_audio: Float32Array): Promise<string> {
  const blob = _lastBlob;
  _lastBlob = null;
  if (!blob) return "";

  const res = await fetch("/api/stt", {
    method: "POST",
    headers: { "Content-Type": blob.type || "audio/webm" },
    body: blob,
  });

  if (!res.ok) throw new Error(`STT error: HTTP ${res.status}`);
  const data = await res.json() as { text?: string; error?: string };
  if (data.error) throw new Error(data.error);
  return (data.text ?? "").trim();
}

/** Legacy: start mic and return a stop() function. Not used by VoiceMode. */
export async function startRecording(): Promise<() => Promise<Float32Array>> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start();

  return () =>
    new Promise<Float32Array>((resolve, reject) => {
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
          _lastBlob = blob;
          resolve(new Float32Array(1));
        } catch (e) {
          reject(e);
        }
      };
      recorder.stop();
    });
}
