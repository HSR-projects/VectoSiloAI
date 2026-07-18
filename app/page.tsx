"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Attachment } from "@/types";
import { useKodaStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBar } from "@/components/search/SearchBar";
import { SuggestedQueries } from "@/components/search/SuggestedQueries";
import { VoiceModePanel } from "@/components/search/VoiceModePanel";
import { Bot } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  useModels();
  const { caps } = useAuth();
  const {
    focusMode,
    setFocusMode,
    createThread,
    agentMode,
    setAgentMode,
    swarmMode,
    setSwarmMode,
    targetUrl,
    setTargetUrl,
    activeCustomAIId,
    customAIs,
  } = useKodaStore();

  const activeAI = activeCustomAIId ? customAIs.find(a => a.id === activeCustomAIId) : null;

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
  useEffect(() => {
    if (typeof window !== "undefined") setSidebarOpen(window.innerWidth >= 768);
  }, []);

  // ── Voice mode ──────────────────────────────────────────────
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceMessages, setVoiceMessages] = useState<{ role: 'assistant' | 'user'; content: string }[]>([]);

  const onVoiceModeToggle = useCallback(() => {
    if (voiceMode) {
      setVoiceMode(false)
    } else {
      setVoiceMode(true)
      setVoiceMessages([])
    }
  }, [voiceMode])

  const onVoiceEnd = useCallback((messages: { role: 'assistant' | 'user'; content: string }[]) => {
    setVoiceMode(false)
    setVoiceMessages(messages)
  }, [])

  // Start a chat from voice messages
  const startFromVoice = useCallback((text: string) => {
    const id = createThread(text || "Voice conversation");
    const state = useKodaStore.getState();
    const thread = state.getThread(id);
    if (thread && !state.incognito) {
      fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread }),
      }).catch(() => {});
    }
    router.push(`/search/${id}?q=${encodeURIComponent(text)}`);
  }, [createThread, router]);

  const start = (query: string, attachments?: Attachment[]) => {
    const id = createThread(query || "Attachment");
    const state = useKodaStore.getState();
    const thread = state.getThread(id);
    if (thread && !state.incognito) {
      fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread }),
      }).catch(() => {});
    }
    if (attachments?.length) {
      useKodaStore.getState().setPendingAttachments(attachments);
    }
    router.push(`/search/${id}?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header showMenu onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="koda-hero-glow flex flex-1 flex-col items-center justify-center overflow-y-auto px-4">
        <div className="w-full max-w-2xl pb-20">
          {activeAI ? (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
              className="mb-8 text-center"
            >
              <motion.div variants={fadeUp} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-koda-surface border border-koda-border shadow-sm">
                <Bot className="h-8 w-8 text-koda-text" />
              </motion.div>
              <motion.h1
                variants={fadeUp}
                className="text-balance text-2xl font-semibold tracking-tight text-koda-text sm:text-3xl"
              >
                {activeAI.name}
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-2 text-xs text-koda-muted">
                {activeAI.description || "A custom AI persona."}
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
              className="mb-6 text-center sm:mb-8"
            >
              <motion.h1
                variants={fadeUp}
                className="text-balance text-3xl font-semibold tracking-tight text-koda-text sm:text-4xl md:text-5xl"
              >
                Ask anything,{" "}
                <span className="bg-gradient-to-r from-koda-accent-soft to-koda-accent bg-clip-text text-transparent">
                  privately
                </span>
                .
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-3 text-koda-muted">
                Search-augmented AI by Koda AI — your queries never
                touch OpenAI or Anthropic.
              </motion.p>
            </motion.div>
          )}

          {/* Voice Mode Panel — appears above search bar */}
          <AnimatePresence>
            {voiceMode && (
              <VoiceModePanel
                onClose={onVoiceEnd}
                enableSearch={true}
              />
            )}
          </AnimatePresence>

          {/* Voice conversation summary — shown after voice mode ends */}
          {voiceMessages.length > 0 && !voiceMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl border border-koda-border bg-koda-surface p-4"
            >
              <p className="text-xs font-medium text-koda-muted mb-3">Voice conversation</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {voiceMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex gap-2 text-sm",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}>
                    <div className={cn(
                      "max-w-[80%] rounded-xl px-3 py-2",
                      msg.role === 'user'
                        ? "bg-koda-accent text-white"
                        : "bg-koda-surface-2 text-koda-text"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const lastUser = [...voiceMessages].reverse().find(m => m.role === 'user')
                  startFromVoice(lastUser?.content || "Continue our conversation")
                }}
                className="mt-3 w-full rounded-lg border border-koda-border bg-koda-surface-2 px-3 py-2 text-xs text-koda-muted hover:bg-koda-border hover:text-koda-text transition-colors"
              >
                Continue in chat...
              </button>
              <button
                onClick={() => setVoiceMessages([])}
                className="mt-1.5 w-full rounded-lg px-3 py-1.5 text-xs text-koda-muted hover:text-koda-text transition-colors"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <SearchBar
              focusMode={focusMode}
              onFocusChange={setFocusMode}
              onSubmit={start}
              autoFocus
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
              onVoiceModeToggle={onVoiceModeToggle}
              voiceMode={voiceMode}
            />
          </motion.div>

          <div className="mt-8">
            {activeAI && activeAI.promptStarters?.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {activeAI.promptStarters.map((starter, i) => (
                  <button
                    key={i}
                    onClick={() => start(starter)}
                    className="flex flex-col items-start rounded-xl border border-koda-border bg-koda-surface p-4 text-left transition-colors hover:border-koda-accent/50 hover:bg-koda-surface-2"
                  >
                    <span className="text-sm font-medium text-koda-text">{starter}</span>
                  </button>
                ))}
              </div>
            ) : (
              <SuggestedQueries onSelect={start} />
            )}
          </div>

          
        </div>
        </main>
      </div>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};
