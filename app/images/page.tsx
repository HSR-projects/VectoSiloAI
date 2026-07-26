"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useIncogniStore } from "@/lib/store";
import { Search, Mic, ArrowUp, Paperclip, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { id: "1", title: "Pin collection", bg: "bg-purple-900" },
  { id: "2", title: "Handwritten style", bg: "bg-blue-900" },
  { id: "3", title: "Anime", bg: "bg-blue-950" },
  { id: "4", title: "Interior design", bg: "bg-stone-800" },
];

export default function ImagesPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const threads = useIncogniStore((s) => s.threads);

  // Extract all generated images from threads
  const images = useMemo(() => {
    const list: { url: string; prompt: string; date: number }[] = [];
    for (const t of threads) {
      for (const m of t.messages) {
        if (m.generatedImages) {
          for (const img of m.generatedImages) {
            if (img.url && img.status === "done") {
              list.push({ url: img.url, prompt: img.prompt, date: m.createdAt });
            }
          }
        }
      }
    }
    return list.sort((a, b) => b.date - a.date);
  }, [threads]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    router.push(`/?q=${encodeURIComponent("Generate an image: " + prompt)}`);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-incogni-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Header showMenu onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12 [scrollbar-width:thin]">
          <div className="mx-auto max-w-4xl space-y-10">
            <h1 className="text-2xl font-semibold text-incogni-text">Images</h1>
            
            <form onSubmit={handleSubmit} className="relative mx-auto max-w-2xl">
              <div className="flex items-center rounded-2xl border border-incogni-border bg-incogni-surface-2 px-4 py-3 shadow-sm transition-colors focus-within:border-incogni-accent/50 focus-within:bg-incogni-surface">
                <button type="button" className="p-1 text-incogni-muted hover:text-incogni-text">
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe a new image"
                  className="flex-1 bg-transparent px-3 text-[15px] text-incogni-text placeholder:text-incogni-muted focus:outline-none"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-incogni-muted">Instant</span>
                  <button type="button" className="p-1 text-incogni-muted hover:text-incogni-text">
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    disabled={!prompt.trim()}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-incogni-text text-incogni-bg transition-opacity disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-medium text-incogni-text">Create an image</h2>
                <div className="flex items-center gap-2">
                  <button className="flex h-8 w-8 items-center justify-center rounded-full border border-incogni-border text-incogni-muted hover:bg-incogni-surface-2">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button className="flex h-8 w-8 items-center justify-center rounded-full border border-incogni-border text-incogni-muted hover:bg-incogni-surface-2">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none]">
                {SUGGESTIONS.map((s) => (
                  <div
                    key={s.id}
                    className={cn("relative h-48 w-40 shrink-0 overflow-hidden rounded-2xl cursor-pointer hover:opacity-90 transition-opacity", s.bg)}
                    onClick={() => setPrompt(`Generate a ${s.title.toLowerCase()} style image...`)}
                  >
                    <div className="absolute bottom-3 left-3 text-sm font-medium text-white/90">
                      {s.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-sm font-medium text-incogni-text">My images</h2>
              {images.length === 0 ? (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-incogni-border bg-incogni-surface-2 text-sm text-incogni-muted">
                  No images generated yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {images.map((img, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-incogni-border bg-incogni-surface-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.prompt}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="absolute bottom-2 left-2 right-2 line-clamp-2 text-[10px] text-white">
                          {img.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
