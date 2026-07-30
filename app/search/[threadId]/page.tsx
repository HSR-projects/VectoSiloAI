"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, FileText, Music, Loader2, Bot, Globe, Image as ImageIcon } from "lucide-react";
import type { Attachment } from "@/types";
import type { Message } from "@/types";
import { useIncogniStore } from "@/lib/store";
import { useModels } from "@/hooks/useModels";
import { uid, cn } from "@/lib/utils";
import { useThread } from "@/hooks/useThread";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBar } from "@/components/search/SearchBar";
import { AnswerPanel } from "@/components/answer/AnswerPanel";


import { AIAvatar } from "@/components/answer/AIAvatar";
import { SourceCards } from "@/components/answer/SourceCards";
import { FollowUpChips } from "@/components/answer/FollowUpChips";
import { MessageActions } from "@/components/answer/MessageActions";
import { UserMessage } from "@/components/answer/UserMessage";
import { SelectionAsk } from "@/components/answer/SelectionAsk";
import { ArtifactPanel } from "@/components/artifacts/ArtifactPanel";
import { IncognitoBanner } from "@/components/layout/IncognitoBanner";
import { VoiceRecorder } from "@/components/voice/VoiceRecorder";

export default function ThreadPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const threadId = params?.threadId as string;

  useModels();
  const { caps } = useAuth();
  const {
    focusMode,
    setFocusMode,
    setActiveThread,
    agentMode,
    setAgentMode,
    swarmMode,
    setSwarmMode,
    thinkMode,
    targetUrl,
    setTargetUrl,
  } = useIncogniStore();
  const artifact = useIncogniStore((s) => s.artifact);
  const { thread, messages } = useThread(threadId);
  const { send, stop, loading, searchWarning } = useChat(threadId);

  const sendOpts = {
    agent: agentMode && caps.agent && !swarmMode,
    agentSteps: caps.agentSteps,
    swarm: swarmMode && caps.swarm,
    swarmAgents: caps.swarmAgents,
    targetUrl: targetUrl || undefined,
    imageGen: caps.imageGen,
    computer: caps.computer,
    slidesMax: caps.slidesMax,
    think: thinkMode,
  };

  const onAgentToggle = () => {
    if (!caps.agent) { router.push("/pricing"); return; }
    setAgentMode(!agentMode);
    if (!agentMode) setSwarmMode(false);
  };

  const onSwarmToggle = () => {
    if (!caps.swarm) { router.push("/pricing"); return; }
    setSwarmMode(!swarmMode);
    if (!swarmMode) setAgentMode(false);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Sidebar must not coexist with an open artifact panel — force it hidden.
  const effectiveSidebarOpen = sidebarOpen && !artifact;
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"answer" | "links" | "images">("answer");
  const [linksPage, setLinksPage] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const sentInitial = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const allSources = useMemo(() => {
    const s = [];
    for (const m of messages) {
      if (m.role === "assistant" && m.sources) {
        s.push(...m.sources);
      }
    }
    return s;
  }, [messages]);

  const allImages = useMemo(() => {
    const imgs = [];
    for (const m of messages) {
      if (m.role === "assistant" && m.searchImages) {
        imgs.push(...m.searchImages);
      }
    }
    return imgs;
  }, [messages]);

  // Re-send from a given user message (edit) or redo an answer (regenerate):
  // drop that turn and everything after it, then send the (edited) text fresh.
  const resendFrom = (userMessageId: string, text: string) => {
    if (loading) return;
    useIncogniStore.getState().deleteMessagesFrom(threadId, userMessageId);
    send(text, sendOpts);
  };

  // Avoid SSR/localStorage hydration mismatch.
  useEffect(() => {
    setMounted(true);
    // Sidebar starts open on desktop, closed on mobile.
    if (typeof window !== "undefined") setSidebarOpen(window.innerWidth >= 768);
  }, []);

  useEffect(() => {
    if (threadId) setActiveThread(threadId);
  }, [threadId, setActiveThread]);

  // A Incogni's Computer sandbox is bound to the chat that built it — it is never
  // persisted or shared. Switching threads discards the sandbox entirely.
  useEffect(() => {
    useIncogniStore.getState().resetComputer();
    useIncogniStore.getState().resetSlides();
    useIncogniStore.getState().resetWorkbook();
    useIncogniStore.getState().resetWebsite();
    useIncogniStore.getState().resetDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Auto-send the initial query (?q=) once for a fresh thread.
  useEffect(() => {
    if (!mounted || sentInitial.current) return;
    const q = searchParams.get("q") ?? "";
    const pending = useIncogniStore.getState().pendingAttachments;
    if ((q || pending.length) && thread && thread.messages.length === 0) {
      sentInitial.current = true;
      if (pending.length) useIncogniStore.getState().setPendingAttachments([]);
      send(q, { ...sendOpts, attachments: pending.length ? pending : undefined });
      // Clean the URL so refresh doesn't re-send.
      router.replace(`/search/${threadId}`);
    } else if (thread && thread.messages.length > 0) {
      sentInitial.current = true;
    }
  }, [mounted, searchParams, thread, send, router, threadId]);

  // Handle interactive question card / quick query submissions.
  useEffect(() => {
    const handleSendQuery = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && typeof detail === "string") {
        send(detail, sendOpts);
      }
    };
    window.addEventListener("incogni:send-query", handleSendQuery);
    return () => window.removeEventListener("incogni:send-query", handleSendQuery);
  }, [send, sendOpts]);

  // Auto-scroll while streaming — only when the user is already near the bottom.
  useEffect(() => {
    const el = bottomRef.current?.closest(".overflow-y-auto") as HTMLElement | null;
    if (!el) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 200) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const voicePlaybackEndRef = useRef<() => void>();

  // When voice mode toggles on, start recording
  useEffect(() => {
    if (voiceMode) setVoiceRecording(true);
  }, [voiceMode]);

  // After TTS playback ends in voice mode, re-trigger recording
  const handleVoiceEnd = useCallback(() => {
    if (voiceMode) setVoiceRecording(true);
  }, [voiceMode]);

  // Detect last assistant message's voiceUrl for auto-play in voice mode  
  const lastAssistantWithVoice = useMemo(() => {
    if (!voiceMode) return undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].voiceUrl) return messages[i].id;
    }
    return undefined;
  }, [messages, voiceMode]);

  const handleVoiceRecorded = async (blob: Blob, duration: number, transcript: string) => {
    setVoiceRecording(false);
    const store = useIncogniStore.getState();
    const tid = threadId;
    if (!tid) return;

    const text = transcript.trim();

    // Convert blob → base64 for passing as attachment to the API
    const toBase64 = (b: Blob): Promise<string> => new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => { const s = String(r.result); resolve(s.slice(s.indexOf(",") + 1)); };
      r.onerror = () => reject(r.error);
      r.readAsDataURL(b);
    });

    const base64 = await toBase64(blob);
    const audioAttachment: Attachment = {
      id: uid(), name: "voice-message.webm", kind: "audio",
      mime: blob.type || "audio/webm", size: blob.size, data: base64,
    };

    const msgId = uid();
    store.appendMessage(tid, {
      id: msgId, role: "user", content: text || "Voice message",
      voiceUrl: URL.createObjectURL(blob), voiceDuration: duration, createdAt: Date.now(),
      attachments: [audioAttachment].map((a) => ({ id: a.id, name: a.name, kind: a.kind, mime: a.mime, size: a.size })),
    });

    // Persist (skip when incognito)
    const thread = store.getThread(tid);
    if (thread && !(thread as any).isTemporary) {
      fetch("/api/threads", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ thread }),
      }).catch(() => {});
    }

    // Always include the audio payload — buildAttachments skips the
    // "can't process" note when the transcript (query text) is meaningful.
    send(text || "Voice message", { ...sendOpts, attachments: [audioAttachment] });
  };

  const notFound = mounted && !thread;

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={effectiveSidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header showMenu onToggleSidebar={() => setSidebarOpen((v) => !v)} title={thread?.title} threadId={threadId} />
        <IncognitoBanner />

        <main id="chat-scroll-container" ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 pt-20 pb-40 sm:pb-44">
            {searchWarning && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {searchWarning}
              </div>
            )}

            {notFound ? (
              <EmptyThread onHome={() => router.push("/")} />
            ) : (
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-incogni-border pb-2 mb-6 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab("answer")}
                    className={cn(
                      "flex items-center gap-1.5 pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                      activeTab === "answer"
                        ? "border-white text-incogni-text"
                        : "border-transparent text-incogni-muted hover:text-incogni-text"
                    )}
                  >
                    <Bot className="h-4 w-4" /> Answer
                  </button>
                  <button
                    onClick={() => setActiveTab("links")}
                    className={cn(
                      "flex items-center gap-1.5 pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                      activeTab === "links"
                        ? "border-white text-incogni-text"
                        : "border-transparent text-incogni-muted hover:text-incogni-text"
                    )}
                  >
                    <Globe className="h-4 w-4" /> Links
                  </button>
                  <button
                    onClick={() => setActiveTab("images")}
                    className={cn(
                      "flex items-center gap-1.5 pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                      activeTab === "images"
                        ? "border-white text-incogni-text"
                        : "border-transparent text-incogni-muted hover:text-incogni-text"
                    )}
                  >
                    <ImageIcon className="h-4 w-4" /> Images
                  </button>
                </div>

                {activeTab === "answer" && (
                  <>
                    {pairMessages(messages).map((pair, i) => (
                      <section key={pair.user?.id ?? i} className="space-y-4">
                        {pair.user && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <UserMessage
                              message={pair.user}
                              disabled={loading}
                              onEdit={(text) => resendFrom(pair.user!.id, text)}
                              attachmentsSlot={
                                pair.user.attachments && pair.user.attachments.length > 0 ? (
                                  <MessageAttachments attachments={pair.user.attachments} />
                                ) : null
                              }
                            />
                          </motion.div>
                        )}
                        {pair.assistant && (
                          <div className="flex gap-4">
                            <div className="shrink-0 mt-1">
                              <AIAvatar />
                            </div>
                            <div className="space-y-3 flex-1 min-w-0">
                              <AnswerPanel
                              message={pair.assistant}
                              voiceAutoPlay={voiceMode && pair.assistant.id === lastAssistantWithVoice}
                              onVoiceEnd={handleVoiceEnd}
                            />
                            {!pair.assistant.streaming && !pair.assistant.error && (
                              <MessageActions
                                threadId={threadId}
                                message={pair.assistant}
                                onRegenerate={
                                  pair.user
                                    ? () => resendFrom(pair.user!.id, pair.user!.content)
                                    : undefined
                                }
                              />
                            )}
                            {!pair.assistant.streaming &&
                              pair.assistant.followups &&
                              pair.assistant.followups.length > 0 && (
                                <FollowUpChips
                                  questions={pair.assistant.followups}
                                  onSelect={(q) => send(q, sendOpts)}
                                  disabled={loading}
                                />
                              )}
                          </div>
                          </div>
                        )}
                      </section>
                    ))}
                  </>
                )}

                {activeTab === "links" && (
                  <div className="space-y-6">
                    {allSources.length > 0 ? (
                      <>
                        {allSources.slice((linksPage - 1) * 5, linksPage * 5).map((source, i) => {
                          const domain = new URL(source.url).hostname;
                          return (
                            <div key={i} className="flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-sm text-incogni-muted">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-incogni-surface">
                                  <Globe className="h-3.5 w-3.5" />
                                </div>
                                <span>{domain}</span>
                              </div>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg font-medium text-blue-500 hover:underline line-clamp-1"
                              >
                                {source.title}
                              </a>
                              {source.snippet && (
                                <p className="text-sm text-incogni-muted line-clamp-2">
                                  {source.snippet}
                                </p>
                              )}
                            </div>
                          );
                        })}
                        {Math.ceil(allSources.length / 5) > 1 && (
                          <div className="flex items-center justify-center gap-2 pt-4">
                            {Array.from({ length: Math.ceil(allSources.length / 5) }).map((_, idx) => (
                              <button
                                key={idx}
                                onClick={() => setLinksPage(idx + 1)}
                                className={cn(
                                  "h-8 w-8 rounded-full text-sm font-medium transition-colors",
                                  linksPage === idx + 1
                                    ? "bg-incogni-text text-incogni-bg"
                                    : "bg-incogni-surface hover:bg-incogni-surface-2 text-incogni-muted"
                                )}
                              >
                                {idx + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-incogni-muted text-center py-8">No links available for this conversation.</div>
                    )}
                  </div>
                )}

                {activeTab === "images" && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {allImages.length > 0 ? (
                      allImages.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedImageIndex(i)}
                          className="group relative block aspect-square overflow-hidden rounded-xl border border-incogni-border bg-incogni-surface transition-all hover:border-incogni-accent/50 text-left"
                          title={img.title}
                        >
                          <img
                            src={img.thumbnailSrc || img.imgSrc}
                            alt={img.title || "Search image"}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 pt-12">
                            <p className="truncate text-xs font-medium text-white shadow-sm">
                              {img.title || "View Source"}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-full text-sm text-incogni-muted text-center py-8">No images available for this conversation.</div>
                    )}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </main>

        {selectedImageIndex !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm">
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute right-6 top-6 text-white/70 hover:text-white"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative flex h-full w-full max-w-6xl items-center justify-center p-8">
              {selectedImageIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(selectedImageIndex - 1); }}
                  className="absolute left-6 rounded-full bg-white/10 p-3 text-white/70 hover:bg-white/20 hover:text-white"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="flex flex-col items-center gap-4">
                <img
                  src={allImages[selectedImageIndex].imgSrc || allImages[selectedImageIndex].thumbnailSrc}
                  alt={allImages[selectedImageIndex].title}
                  className="max-h-[80vh] max-w-full object-contain"
                />
                <a
                  href={allImages[selectedImageIndex].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-medium text-white hover:underline"
                >
                  {allImages[selectedImageIndex].title || "View Source"}
                </a>
              </div>
              {selectedImageIndex < allImages.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedImageIndex(selectedImageIndex + 1); }}
                  className="absolute right-6 rounded-full bg-white/10 p-3 text-white/70 hover:bg-white/20 hover:text-white"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Sticky follow-up input — scoped to the main column so the artifact
            panel never overlaps it. */}
        {!notFound && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-incogni-bg via-incogni-bg/90 to-transparent pt-10 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="pointer-events-auto mx-auto max-w-3xl px-4">
              {(voiceRecording || voiceMode) && (
                <VoiceRecorder
                  onRecorded={handleVoiceRecorded}
                  onCancel={() => { setVoiceRecording(false); setVoiceMode(false); }}
                />
              )}
              <SearchBar
                focusMode={focusMode}
                onFocusChange={setFocusMode}
                onSubmit={(q, attachments) => send(q, { ...sendOpts, attachments })}
                placeholder="Ask a follow-up…"
                loading={loading}
                onStop={stop}
                showAgent
                agentMode={agentMode}
                agentLocked={!caps.agent}
                onAgentToggle={onAgentToggle}
                showSwarm
                swarmMode={swarmMode}
                swarmLocked={!caps.swarm}
                onSwarmToggle={onSwarmToggle}
                targetUrl={targetUrl}
                onTargetUrlChange={setTargetUrl}
                showVoiceRecord
                onVoiceRecord={() => setVoiceRecording(true)}
              />
            </div>
          </div>
        )}

      </div>

      <ArtifactPanel />
      <SelectionAsk containerRef={mainRef} />
    </div>
  );
}

function EmptyThread({ onHome }: { onHome: () => void }) {
  return null;
}

/** Render a user message's attachments as thumbnails (images) and chips. */
function MessageAttachments({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.map((a) =>
        a.kind === "image" && a.thumbUrl ? (
          <a
            key={a.id}
            href={a.thumbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block h-20 w-20 overflow-hidden rounded-lg border border-incogni-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.thumbUrl} alt={a.name} className="h-full w-full object-cover" />
          </a>
        ) : (
          <span
            key={a.id}
            className="inline-flex max-w-[200px] items-center gap-1.5 rounded-lg border border-incogni-border bg-incogni-surface px-2.5 py-1.5 text-xs text-incogni-muted"
          >
            {a.kind === "audio" ? (
              <Music className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <FileText className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="truncate">{a.name}</span>
          </span>
        )
      )}
    </div>
  );
}

/** Group the flat message list into [user, assistant] pairs for rendering. */
function pairMessages(messages: Message[]) {
  const pairs: { user?: Message; assistant?: Message }[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      pairs.push({ user: m });
    } else if (m.role === "assistant") {
      const last = pairs[pairs.length - 1];
      if (last && !last.assistant) last.assistant = m;
      else pairs.push({ assistant: m });
    }
  }
  return pairs;
}
