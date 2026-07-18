"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, FileText, Music, Loader2 } from "lucide-react";
import type { Attachment } from "@/types";
import type { Message } from "@/types";
import { useKodaStore } from "@/lib/store";
import { useModels } from "@/hooks/useModels";
import { uid } from "@/lib/utils";
import { useThread } from "@/hooks/useThread";
import { useChat } from "@/hooks/useChat";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBar } from "@/components/search/SearchBar";
import { AnswerPanel } from "@/components/answer/AnswerPanel";
import { AgentSteps } from "@/components/answer/AgentSteps";
import { SwarmPanel } from "@/components/answer/SwarmPanel";
import { SourceCards } from "@/components/answer/SourceCards";
import { FollowUpChips } from "@/components/answer/FollowUpChips";
import { MessageActions } from "@/components/answer/MessageActions";
import { UserMessage } from "@/components/answer/UserMessage";
import { SelectionAsk } from "@/components/answer/SelectionAsk";
import { ArtifactPanel } from "@/components/artifacts/ArtifactPanel";
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
  } = useKodaStore();
  const artifact = useKodaStore((s) => s.artifact);
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
  const sentInitial = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Re-send from a given user message (edit) or redo an answer (regenerate):
  // drop that turn and everything after it, then send the (edited) text fresh.
  const resendFrom = (userMessageId: string, text: string) => {
    if (loading) return;
    useKodaStore.getState().deleteMessagesFrom(threadId, userMessageId);
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

  // A Koda's Computer sandbox is bound to the chat that built it — it is never
  // persisted or shared. Switching threads discards the sandbox entirely.
  useEffect(() => {
    useKodaStore.getState().resetComputer();
    useKodaStore.getState().resetSlides();
    useKodaStore.getState().resetWorkbook();
    useKodaStore.getState().resetWebsite();
    useKodaStore.getState().resetDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Auto-send the initial query (?q=) once for a fresh thread.
  useEffect(() => {
    if (!mounted || sentInitial.current) return;
    const q = searchParams.get("q") ?? "";
    const pending = useKodaStore.getState().pendingAttachments;
    if ((q || pending.length) && thread && thread.messages.length === 0) {
      sentInitial.current = true;
      if (pending.length) useKodaStore.getState().setPendingAttachments([]);
      send(q, { ...sendOpts, attachments: pending.length ? pending : undefined });
      // Clean the URL so refresh doesn't re-send.
      router.replace(`/search/${threadId}`);
    } else if (thread && thread.messages.length > 0) {
      sentInitial.current = true;
    }
  }, [mounted, searchParams, thread, send, router, threadId]);

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
    const store = useKodaStore.getState();
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
    if (thread && !store.incognito) {
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

        <main id="chat-scroll-container" ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 pb-40 sm:pb-44">
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
                      <div className="space-y-3">
                        {pair.assistant.swarmAgents &&
                          pair.assistant.swarmAgents.length > 0 ? (
                            <SwarmPanel agents={pair.assistant.swarmAgents} />
                          ) : pair.assistant.steps &&
                            pair.assistant.steps.length > 0 ? (
                            <AgentSteps steps={pair.assistant.steps} />
                          ) : null}
                        {pair.assistant.sources &&
                          pair.assistant.sources.length > 0 && (
                            <SourceCards sources={pair.assistant.sources} />
                          )}
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
                    )}
                  </section>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </main>

        {/* Sticky follow-up input — scoped to the main column so the artifact
            panel never overlaps it. */}
        {!notFound && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-koda-bg via-koda-bg/90 to-transparent pt-10 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
            className="block h-20 w-20 overflow-hidden rounded-lg border border-koda-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.thumbUrl} alt={a.name} className="h-full w-full object-cover" />
          </a>
        ) : (
          <span
            key={a.id}
            className="inline-flex max-w-[200px] items-center gap-1.5 rounded-lg border border-koda-border bg-koda-surface px-2.5 py-1.5 text-xs text-koda-muted"
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
