"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Attachment } from "@/types";
import { useIncogniStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";
import { useAuth } from "@/components/auth/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SearchBar } from "@/components/search/SearchBar";
import { SuggestedQueries } from "@/components/search/SuggestedQueries";
import { VoiceModePanel } from "@/components/search/VoiceModePanel";
import { IncognitoBanner } from "@/components/layout/IncognitoBanner";
import { Bot, Image as ImageIcon, FileText, Search, Newspaper, Video, Sparkles, ChevronDown, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
    incognito,
  } = useIncogniStore();

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
    const state = useIncogniStore.getState();
    const thread = state.getThread(id);
    if (thread && !(thread as any).isTemporary) {
      fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread }),
      }).catch(() => {});
    }
    router.push(`/search/${id}?q=${encodeURIComponent(text)}`);
  }, [createThread, router]);

  const start = (query: string, attachments?: Attachment[]) => {
    const state = useIncogniStore.getState();
    
    if (state.engineMode === "search") {
      setSearchQuery(query);
      setSearchPage(1);
      fetchResults(query, searchCategory, 1, false);
      return;
    }

    const id = createThread(query || "Attachment");
    const thread = state.getThread(id);
    if (thread && !(thread as any).isTemporary) {
      fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread }),
      }).catch(() => {});
    }
    if (attachments?.length) {
      state.setPendingAttachments(attachments);
    }
    router.push(`/search/${id}?q=${encodeURIComponent(query)}`);
  };

  const { engineMode, setEngineMode } = useIncogniStore();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchCategory, setSearchCategory] = useState<string>("");
  const [searchPage, setSearchPage] = useState(1);
  const [searchOverview, setSearchOverview] = useState("");
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchResults = async (q: string, cat: string, page: number, append = false) => {
    if (!q.trim()) return;
    setSearchLoading(true);
    setHasSearched(true);
    if (!append) {
      setSearchResults([]);
      setSearchOverview("");
    }
    try {
      const res = await fetch("/api/web/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, category: cat, pageno: page }),
      });
      const data = await res.json();
      if (append) {
        setSearchResults(prev => [...prev, ...(data.results || [])]);
      } else {
        setSearchResults(data.results || []);
        if (data.results?.length > 0 && !cat) {
          generateOverview(q, data.results);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  };

  const generateOverview = async (q: string, resList: any[]) => {
    setOverviewLoading(true);
    setSearchOverview("");
    const context = resList.map((r, i) => `[${i+1}] ${r.title}\n${r.snippet}`).join("\n\n");
    try {
      const res = await fetch("/api/web/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, context }),
      });
      if (!res.ok) throw new Error("Overview failed");
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setSearchOverview((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchPage(1);
    fetchResults(searchQuery, searchCategory, 1, false);
  };

  const loadMore = () => {
    const nextPage = searchPage + 1;
    setSearchPage(nextPage);
    fetchResults(searchQuery, searchCategory, nextPage, true);
  };

  const handleCategoryChange = (cat: string) => {
    setSearchCategory(cat);
    setSearchPage(1);
    fetchResults(searchQuery, cat, 1, false);
  };
  const handleEngineToggle = (mode: "ai" | "search") => {
    if (mode === "search" && (!user || user.plan === "free")) {
      router.push("/pricing");
      return;
    }
    setEngineMode(mode);
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header showMenu onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <IncognitoBanner />
        <main className="incogni-hero-glow flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 relative">
        
        <div className="w-full max-w-2xl pb-20">
          
          <>

            <>
              {activeAI ? (
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
                  className="mb-8 text-center"
                >
                  <motion.div variants={fadeUp} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-incogni-surface border border-incogni-border shadow-sm">
                    <Bot className="h-8 w-8 text-incogni-text" />
                  </motion.div>
                  <motion.h1
                    variants={fadeUp}
                    className="text-balance text-2xl font-semibold tracking-tight text-incogni-text sm:text-3xl"
                  >
                    {activeAI.name}
                  </motion.h1>
                  <motion.p variants={fadeUp} className="mt-2 text-xs text-incogni-muted">
                    {activeAI.description || "A custom AI persona."}
                  </motion.p>
                </motion.div>
              ) : (
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
                  className="mb-8 text-center"
                >
                  <motion.h1
                    variants={fadeUp}
                    className="text-balance text-3xl font-semibold tracking-tight text-incogni-text sm:text-4xl"
                  >
                    {incognito ? "Hi stranger" : "Where should we begin?"}
                  </motion.h1>
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
                  className="mb-4 rounded-2xl border border-incogni-border bg-incogni-surface p-4"
                >
                  <p className="text-xs font-medium text-incogni-muted mb-3">Voice conversation</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {voiceMessages.map((msg, i) => (
                      <div key={i} className={cn(
                        "flex gap-2 text-sm",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}>
                        <div className={cn(
                          "max-w-[80%] rounded-xl px-3 py-2",
                          msg.role === 'user'
                            ? "bg-incogni-accent text-white"
                            : "bg-incogni-surface-2 text-incogni-text"
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
                    className="mt-3 w-full rounded-lg border border-incogni-border bg-incogni-surface-2 px-3 py-2 text-xs text-incogni-muted hover:bg-incogni-border hover:text-incogni-text transition-colors"
                  >
                    Continue in chat...
                  </button>
                  <button
                    onClick={() => setVoiceMessages([])}
                    className="mt-1.5 w-full rounded-lg px-3 py-1.5 text-xs text-incogni-muted hover:text-incogni-text transition-colors"
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

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {activeAI && activeAI.promptStarters?.length ? (
                  activeAI.promptStarters.map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => start(starter)}
                      className="flex items-center gap-2 rounded-full border border-incogni-border bg-incogni-bg px-4 py-2 text-sm text-incogni-muted transition-colors hover:bg-incogni-surface"
                    >
                      {starter}
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      onClick={() => start("Create an image")}
                      className="flex items-center gap-2 rounded-full border border-incogni-border bg-incogni-bg px-4 py-2 text-sm text-incogni-muted transition-colors hover:bg-incogni-surface"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Create an image
                    </button>
                    <button
                      onClick={() => start("Write or edit text")}
                      className="flex items-center gap-2 rounded-full border border-incogni-border bg-incogni-bg px-4 py-2 text-sm text-incogni-muted transition-colors hover:bg-incogni-surface"
                    >
                      <FileText className="h-4 w-4" />
                      Write or edit
                    </button>
                    <button
                      onClick={() => start("Look something up")}
                      className="flex items-center gap-2 rounded-full border border-incogni-border bg-incogni-bg px-4 py-2 text-sm text-incogni-muted transition-colors hover:bg-incogni-surface"
                    >
                      <Search className="h-4 w-4" />
                      Look something up
                    </button>
                  </>
                )}
              </div>
            </>
          </>
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
