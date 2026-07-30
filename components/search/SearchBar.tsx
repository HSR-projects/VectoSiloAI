"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp, Search, Loader2, Bot, Lock, Network, Plus, Link, X, Square, Mic,
  Paperclip, FileText, Music, Image as ImageIcon, Brain, Sparkles, Clock,
} from "lucide-react";
import type { Attachment, FocusMode } from "@/types";
import { FocusModes } from "./FocusModes";
import { useIncogniStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { useLocalSearchHistory } from "@/hooks/useLocalSearchHistory";

import {
  ACCEPT_ATTACHMENTS, MAX_ATTACHMENTS, fileToAttachment, humanSize,
} from "@/lib/attachments";

// Minimal Web Speech API typings (not in lib.dom for all targets).
interface SpeechRecResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecEvent {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecResult };
}
interface SpeechRec {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: SpeechRecEvent) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
  stop: () => void;
}
type SpeechRecCtor = new () => SpeechRec;

function getSpeechRecognitionCtor(): SpeechRecCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecCtor;
    webkitSpeechRecognition?: SpeechRecCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface SearchBarProps {
  focusMode: FocusMode;
  onFocusChange: (m: FocusMode) => void;
  onSubmit: (query: string, attachments?: Attachment[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
  loading?: boolean;
  /** Called when the user clicks Stop while a response is streaming. */
  onStop?: () => void;
  showFocusModes?: boolean;
  className?: string;

  /** Show the file-attachment button (images, text, audio). Default true. */
  showAttach?: boolean;

  /** Show the single-agent toggle. */
  showAgent?: boolean;
  agentMode?: boolean;
  agentLocked?: boolean;
  onAgentToggle?: () => void;

  /** Show voice record button (inline voice recording in chat). */
  showVoiceRecord?: boolean;
  onVoiceRecord?: () => void;

  /** Voice mode active state — shows active pulse + ends on click. */
  voiceMode?: boolean;
  onVoiceModeToggle?: () => void;

  /** Show the Agent Swarm toggle. */
  showSwarm?: boolean;
  swarmMode?: boolean;
  swarmLocked?: boolean;
  onSwarmToggle?: () => void;

  /** URL focus — paste a URL and the AI reads that page instead of searching. */
  targetUrl?: string;
  onTargetUrlChange?: (url: string) => void;
}

function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 30);
  }
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function SearchBar({
  focusMode,
  onFocusChange,
  onSubmit,
  placeholder = "What would you like to know?",
  autoFocus,
  loading,
  onStop,
  showFocusModes = true,
  className,
  showAttach = true,
  showAgent = false,
  agentMode = false,
  agentLocked = false,
  onAgentToggle,
  showSwarm = false,
  swarmMode = false,
  swarmLocked = false,
  onSwarmToggle,
  targetUrl = "",
  onTargetUrlChange,
  showVoiceRecord,
  onVoiceRecord,
  voiceMode,
  onVoiceModeToggle,
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const [autoOpen, setAutoOpen] = useState(false);
  const [autoIndex, setAutoIndex] = useState(-1);
  const { add: addHistory } = useLocalSearchHistory();
  const { suggestions, isLoading: autoLoading, isDegraded } = useAutocomplete(value);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [dictateSupported, setDictateSupported] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRec | null>(null);

  // Auto-resize textarea up to ~5 lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // Pick up externally-seeded composer text (e.g. "Ask Incogni AI" on a selection).
  const composerDraft = useIncogniStore((s) => s.composerDraft);
  const clearDraft = useIncogniStore((s) => s.setComposerDraft);
  const dictationEnabled = useIncogniStore((s) => s.dictationEnabled);
  const thinkMode = useIncogniStore((s) => s.thinkMode);
  const setThinkMode = useIncogniStore((s) => s.setThinkMode);
  useEffect(() => {
    if (!composerDraft) return;
    setValue((v) => (v ? v + "\n\n" : "") + composerDraft);
    clearDraft("");
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    });
  }, [composerDraft, clearDraft]);

  // Listen for 1-click preview auto-fix events
  useEffect(() => {
    const handleFix = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.error) {
        const fixPrompt = `Fix this website/preview runtime error:\n\`\`\`\n${detail.error}\n\`\`\`\nInspect the existing code and re-emit complete fixed files.`;
        onSubmit(fixPrompt, attachments);
      }
    };
    window.addEventListener("incogni-fix-code", handleFix);
    return () => window.removeEventListener("incogni-fix-code", handleFix);
  }, [onSubmit, attachments]);

  // When URL input becomes visible, focus it.
  useEffect(() => {
    if (urlOpen && !targetUrl) urlRef.current?.focus();
  }, [urlOpen, targetUrl]);

  const submit = () => {
    const q = value.trim();
    if ((!q && attachments.length === 0) || loading) return;
    if (listening) {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
      setListening(false);
    }
    addHistory(q);
    onSubmit(q, attachments.length ? attachments : undefined);
    setValue("");
    setAutoOpen(false);
    setAttachments([]);
    setAttachError(null);
  };

  const onChange = (val: string) => {
    setValue(val);
    onSlashChange(val);
    if (!val.startsWith("/")) {
      setAutoOpen(true);
      setAutoIndex(-1);
    } else {
      setAutoOpen(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        slashIdxRef.current = Math.min(slashIdxRef.current + 1, filteredSlash.length - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        slashIdxRef.current = Math.max(slashIdxRef.current - 1, 0);
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (filteredSlash[slashIdxRef.current]) {
          e.preventDefault();
          execSlash(filteredSlash[slashIdxRef.current]);
        }
      } else if (e.key === "Escape") {
        setSlashOpen(false);
        setSlashQuery("");
      }
      return;
    }
    if (autoOpen && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAutoIndex(Math.min(autoIndex + 1, suggestions.length - 1));
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setAutoIndex(Math.max(autoIndex - 1, -1));
        return;
      } else if (e.key === "Enter" && !e.shiftKey && autoIndex >= 0) {
        e.preventDefault();
        const text = suggestions[autoIndex].text;
        addHistory(text);
        onSubmit(text, attachments.length ? attachments : undefined);
        setValue("");
        setAutoOpen(false);
        return;
      } else if (e.key === "Escape") {
        setAutoOpen(false);
        setAutoIndex(-1);
        return;
      } else if (e.key === "Tab") {
        setAutoOpen(false);
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const addFiles = async (files: FileList | File[]) => {
    setAttachError(null);
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setAttachError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }
    const picked = Array.from(files).slice(0, room);
    setAttachLoading(true);
    const results = await Promise.all(picked.map(fileToAttachment));
    setAttachLoading(false);
    const ok: Attachment[] = [];
    let firstError: string | null = null;
    for (const r of results) {
      if (r.attachment) ok.push(r.attachment);
      else if (r.error && !firstError) firstError = r.error;
    }
    if (ok.length) setAttachments((prev) => [...prev, ...ok]);
    if (firstError) setAttachError(firstError);
  };

  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  // ── Slash command menu ─────────────────────────────────────
  type SlashCmd = {
    id: string; label: string; desc: string; icon: string;
    action: () => void;
  };

  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const slashIdxRef = useRef(0);
  const slashRef = useRef<HTMLDivElement>(null);

  const slashCommands: SlashCmd[] = [
    { id: "agent", label: "/agent", desc: "Multi-step autonomous research", icon: "🤖",
      action: () => { onAgentToggle?.(); } },
    { id: "swarm", label: "/swarm", desc: "Parallel specialist agents", icon: "🧠",
      action: () => { onSwarmToggle?.(); } },
    { id: "think", label: "/think", desc: "Reason inside a think block", icon: "💭",
      action: () => { setThinkMode(!thinkMode); } },
    { id: "search", label: "/search", desc: "Web search focus", icon: "🌐",
      action: () => { onFocusChange("all"); } },
    { id: "academic", label: "/academic", desc: "Academic research focus", icon: "📚",
      action: () => { onFocusChange("academic"); } },
    { id: "code", label: "/code", desc: "Code generation focus", icon: "💻",
      action: () => { onFocusChange("code"); } },
    { id: "image", label: "/image", desc: "Generate an image with FLUX", icon: "🎨",
      action: () => { setValue("/image "); ref.current?.focus(); } },
    { id: "website", label: "/website", desc: "Build a website", icon: "🌍",
      action: () => { onFocusChange("code"); setValue((v) => "Build a website: " + v.replace(/^\/\w+\s*/, "")); } },
    { id: "slides", label: "/slides", desc: "Create a presentation", icon: "📊",
      action: () => { setValue((v) => "Create a slide deck about " + v.replace(/^\/\w+\s*/, "")); } },
  ];

  const filteredSlash = slashQuery
    ? slashCommands.filter((c) => c.id.includes(slashQuery.toLowerCase()))
    : slashCommands;

  const execSlash = (cmd: SlashCmd) => {
    setSlashOpen(false);
    setSlashQuery("");
    setValue((v) => v.replace(/^\/\w*(\s|$)/, "").trimStart());
    cmd.action();
  };

  // Detect "/" at start or after space
  const onSlashChange = (val: string) => {
    const match = val.match(/(?:^|\s)\/(\w*)$/);
    if (match) {
      setSlashOpen(true);
      setSlashQuery(match[1] || "");
      slashIdxRef.current = 0;
    } else if (slashOpen) {
      setSlashOpen(false);
      setSlashQuery("");
    }
  };

  // ── Dictation (Web Speech API) ──────────────────────────────
  useEffect(() => {
    setDictateSupported(!!getSpeechRecognitionCtor());
    return () => {
      try { recognitionRef.current?.stop(); } catch { /* noop */ }
    };
  }, []);

  const toggleDictation = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = useIncogniStore.getState().dictationLang || navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    rec.onresult = (e: SpeechRecEvent) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      finalText = finalText.trim();
      if (finalText) {
        setValue((v) => (v.trim() ? v.replace(/\s*$/, " ") : "") + finalText + " ");
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    try {
      rec.start();
      ref.current?.focus();
    } catch {
      setListening(false);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // items is more reliable than files for pasted screenshots/images
    const items = Array.from(e.clipboardData?.items ?? []);
    const files = items
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (files.length) {
      e.preventDefault();
      void addFiles(files);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setDragging(true);
    }
  };

  const onDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the container entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) void addFiles(files);
  };

  const commitUrl = () => {
    const trimmed = urlDraft.trim();
    if (isValidUrl(trimmed)) {
      onTargetUrlChange?.(trimmed);
      setUrlDraft("");
    } else if (!trimmed) {
      onTargetUrlChange?.("");
    }
    setUrlOpen(false);
  };

  const clearUrl = () => {
    onTargetUrlChange?.("");
    setUrlDraft("");
    setUrlOpen(false);
  };

  const toggleUrl = () => {
    if (targetUrl) {
      clearUrl();
    } else {
      setUrlOpen((v) => !v);
    }
  };



  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className={cn(
          "group relative flex flex-col gap-2 rounded-[32px] border bg-incogni-bg px-4 py-3 shadow-sm transition-shadow focus-within:border-incogni-border focus-within:shadow-md",
          dragging ? "border-incogni-accent shadow-md" : "border-incogni-border"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Drag-over overlay */}
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-incogni-accent/10 backdrop-blur-sm">
            <Paperclip className="h-6 w-6 text-incogni-accent" />
            <span className="text-sm font-medium text-incogni-accent">Drop to attach</span>
          </div>
        )}
        

        {/* Attachment previews */}
        {(attachments.length > 0 || attachLoading) && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a) => (
              <AttachmentChip key={a.id} attachment={a} onRemove={() => removeAttachment(a.id)} />
            ))}
            {attachLoading && (
              <div className="flex items-center gap-2 rounded-lg border border-incogni-border bg-incogni-surface-2 px-2.5 py-1.5">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-incogni-accent" />
                <span className="text-xs text-incogni-muted">Reading image…</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2 relative">
          {showAttach && (
            <>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={ACCEPT_ATTACHMENTS}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                aria-label="Attach files"
                title="Attach images, text, or audio"
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-incogni-muted transition-colors hover:bg-incogni-surface-2 hover:text-incogni-text disabled:opacity-50"
              >
                <Plus className="h-5 w-5" />
              </button>
            </>
          )}

          {slashOpen && filteredSlash.length > 0 && (
            <div
              ref={slashRef}
              className="absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden rounded-xl border border-incogni-border bg-incogni-surface shadow-xl"
            >
              {filteredSlash.map((cmd, i) => (
                <button
                  key={cmd.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                    i === slashIdxRef.current
                      ? "bg-incogni-accent/15 text-incogni-accent"
                      : "text-incogni-text hover:bg-incogni-surface-2"
                  )}
                  onMouseEnter={() => { slashIdxRef.current = i; }}
                  onMouseDown={(e) => { e.preventDefault(); execSlash(cmd); }}
                >
                  <span className="text-lg">{cmd.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{cmd.label}</div>
                    <div className="text-xs text-incogni-muted truncate">{cmd.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {autoOpen && !slashOpen && value.trim().length > 0 && suggestions.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-50 overflow-hidden rounded-xl border border-incogni-border bg-incogni-surface shadow-xl">
              {suggestions.map((suggestion, i) => (
                <button
                  key={suggestion.text}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                    i === autoIndex
                      ? "bg-incogni-accent/15 text-incogni-accent"
                      : "text-incogni-text hover:bg-incogni-surface-2"
                  )}
                  onMouseEnter={() => setAutoIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addHistory(suggestion.text);
                    onSubmit(suggestion.text, attachments.length ? attachments : undefined);
                    setValue("");
                    setAutoOpen(false);
                  }}
                >
                  {suggestion.category === "ai" ? (
                    <Sparkles className="h-4 w-4 shrink-0 text-[#10a37f]" />
                  ) : (
                    <Clock className="h-4 w-4 shrink-0" />
                  )}
                  <span className="flex-1 truncate">
                    {suggestion.highlightRanges.length > 0 ? (
                      <span>
                        {suggestion.text.slice(0, suggestion.highlightRanges[0][0])}
                        <span className="font-semibold text-incogni-text">
                          {suggestion.text.slice(suggestion.highlightRanges[0][0], suggestion.highlightRanges[0][1])}
                        </span>
                        {suggestion.text.slice(suggestion.highlightRanges[0][1])}
                      </span>
                    ) : (
                      suggestion.text
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={placeholder}
            aria-label="Search query"
            className="max-h-[140px] flex-1 resize-none bg-transparent py-1 text-[15px] leading-relaxed text-incogni-text placeholder:text-incogni-muted focus:outline-none break-words [overflow-wrap:anywhere]"
          />

          {showVoiceRecord && (
            <button
              type="button"
              onClick={onVoiceRecord}
              aria-label="Voice record"
              title="Record voice message"
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-incogni-muted transition-colors hover:bg-incogni-surface-2 hover:text-incogni-text"
            >
              <Mic className="h-[18px] w-[18px]" />
            </button>
          )}

          {onVoiceModeToggle && (
            <button
              type="button"
              onClick={onVoiceModeToggle}
              aria-label={voiceMode ? "End voice mode" : "Start voice mode"}
              title={voiceMode ? "End voice mode" : "Start voice mode"}
              className={cn(
                "mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                voiceMode
                  ? "bg-incogni-accent/20 text-incogni-accent animate-pulse shadow-[0_0_12px_rgba(167,139,250,0.5)]"
                  : "text-incogni-muted hover:bg-incogni-surface-2 hover:text-incogni-text"
              )}
            >
              <Mic className="h-[18px] w-[18px]" />
            </button>
          )}

          {loading && onStop ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop response"
              title="Stop"
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-incogni-text text-incogni-bg transition-all hover:opacity-90"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={(!value.trim() && attachments.length === 0) || loading}
              aria-label="Send"
              className={cn(
                "mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
                (value.trim() || attachments.length > 0) && !loading
                  ? "bg-incogni-text text-incogni-bg hover:opacity-90 hover:shadow-md"
                  : "bg-incogni-surface-2 text-incogni-muted"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {attachError && (
        <p className="-mt-1 px-1 text-xs text-amber-300">{attachError}</p>
      )}

      {/* URL input row — shown when toggled open and no URL is set yet */}
      {urlOpen && !targetUrl && (
        <div className="flex items-center gap-2 rounded-xl border border-incogni-border bg-incogni-surface px-3 py-2">
          <Link className="h-4 w-4 shrink-0 text-incogni-muted" />
          <input
            ref={urlRef}
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitUrl(); }
              if (e.key === "Escape") { setUrlOpen(false); setUrlDraft(""); }
            }}
            onBlur={commitUrl}
            placeholder="Paste a URL — AI reads that page instead of searching"
            className="flex-1 bg-transparent text-sm text-incogni-text placeholder:text-incogni-muted focus:outline-none"
          />
          <button
            onClick={() => { setUrlOpen(false); setUrlDraft(""); }}
            className="text-incogni-muted hover:text-incogni-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}


    </div>
  );
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  const { kind, name, size, thumbUrl } = attachment;

  if (kind === "image" && thumbUrl) {
    return (
      <div className="group/att relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-incogni-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbUrl} alt={name} className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover/att:opacity-100"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  const Icon = kind === "audio" ? Music : kind === "image" ? ImageIcon : FileText;

  return (
    <div className="flex max-w-[220px] items-center gap-2 rounded-lg border border-incogni-border bg-incogni-surface-2 px-2.5 py-1.5">
      <Icon className="h-4 w-4 shrink-0 text-incogni-muted" />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-xs text-incogni-text">{name}</span>
        <span className="text-[10px] text-incogni-muted">{humanSize(size)}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
        className="shrink-0 text-incogni-muted hover:text-incogni-text"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
