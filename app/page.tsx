"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Attachment } from "@/types";
import { useKodaStore } from "@/lib/store";
import { useModels } from "@/hooks/useModels";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBar } from "@/components/search/SearchBar";
import { SuggestedQueries } from "@/components/search/SuggestedQueries";

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
  } = useKodaStore();

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
  // Sidebar starts open on desktop, closed on mobile (avoid SSR hydration mismatch).
  useEffect(() => {
    if (typeof window !== "undefined") setSidebarOpen(window.innerWidth >= 768);
  }, []);

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
    // Hand attachments off to the thread page, which sends them with the query.
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
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.1 } },
            }}
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
            />
          </motion.div>

          <div className="mt-8">
            <SuggestedQueries onSelect={start} />
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
