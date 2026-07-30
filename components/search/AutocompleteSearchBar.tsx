"use client";

import React, { useState, useEffect, useRef } from "react";
import { openDB } from "idb";
import { Clock, Sparkles, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Suggestion {
  text: string;
  category: "recent" | "trending" | "ai" | "match";
  score: number;
  highlightRanges: [number, number][];
}

interface AutocompleteResponse {
  query: string;
  suggestions: Suggestion[];
  latencyMs: number;
  degraded: boolean;
}

const DB_NAME = "incogniai_search_db";
const STORE_NAME = "recent_searches";

// --- Hooks ---

function useLocalSearchHistory() {
  const initDB = async () => {
    return openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "text" });
          store.createIndex("timestamp", "timestamp");
        }
      },
    });
  };

  const add = async (text: string) => {
    if (!text.trim()) return;
    const db = await initDB();
    await db.put(STORE_NAME, { text: text.trim(), timestamp: Date.now() });
    
    // Cap at 50
    const all = await db.getAllFromIndex(STORE_NAME, "timestamp");
    if (all.length > 50) {
      const toDelete = all.slice(0, all.length - 50);
      const tx = db.transaction(STORE_NAME, "readwrite");
      for (const item of toDelete) {
        tx.store.delete(item.text);
      }
      await tx.done;
    }
  };

  const getRecent = async (prefix: string, limit: number): Promise<Suggestion[]> => {
    const db = await initDB();
    const all = await db.getAllFromIndex(STORE_NAME, "timestamp");
    const sorted = all.reverse(); // newest first
    
    let matches = sorted;
    if (prefix) {
      const lowerPrefix = prefix.toLowerCase();
      matches = sorted.filter(item => item.text.toLowerCase().includes(lowerPrefix));
    }
    
    return matches.slice(0, limit).map(item => {
      const lowerText = item.text.toLowerCase();
      const lowerPrefix = prefix?.toLowerCase() || "";
      const idx = lowerPrefix ? lowerText.indexOf(lowerPrefix) : -1;
      const highlightRanges: [number, number][] = idx >= 0 ? [[idx, idx + lowerPrefix.length]] : [];
      
      return {
        text: item.text,
        category: "recent",
        score: 1.0,
        highlightRanges
      };
    });
  };

  const clear = async () => {
    const db = await initDB();
    await db.clear(STORE_NAME);
  };

  return { add, getRecent, clear };
}

function useAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { getRecent } = useLocalSearchHistory();

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query || query.length < 2) {
      // Just show recents if empty or too short
      getRecent("", 5).then(recents => {
        setSuggestions(recents);
        setIsLoading(false);
        setIsDegraded(false);
      });
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchSuggestions = async () => {
      try {
        const recents = await getRecent(query, 2);
        
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}&limit=6`, {
          signal: controller.signal
        });
        
        if (!res.ok) {
          throw new Error("API Error");
        }
        
        const data: AutocompleteResponse = await res.json();
        
        // Dedupe
        const recentTexts = new Set(recents.map(r => r.text.toLowerCase()));
        const filteredAi = data.suggestions.filter(s => !recentTexts.has(s.text.toLowerCase()));
        
        if (!controller.signal.aborted) {
          setSuggestions([...recents, ...filteredAi]);
          setIsDegraded(data.degraded);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err.name !== "AbortError" && !controller.signal.aborted) {
          const recents = await getRecent(query, 5);
          setSuggestions(recents);
          setIsDegraded(true);
          setIsLoading(false);
        }
      }
    };

    const timer = setTimeout(fetchSuggestions, 150); // 150ms debounce
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { suggestions, isLoading, isDegraded };
}

// --- Component ---

export function AutocompleteSearchBar({ onSearch }: { onSearch?: (q: string) => void }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { add: addHistory } = useLocalSearchHistory();
  const { suggestions, isLoading } = useAutocomplete(query);
  const router = useRouter();

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (text: string) => {
    addHistory(text);
    setQuery(text);
    setIsOpen(false);
    inputRef.current?.blur();
    if (onSearch) {
      onSearch(text);
    } else {
      router.push(`/?q=${encodeURIComponent(text)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex].text);
      } else if (query.trim()) {
        handleSelect(query);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  const renderHighlightedText = (text: string, ranges: [number, number][]) => {
    if (!ranges.length) return <span>{text}</span>;
    const [start, end] = ranges[0];
    return (
      <span>
        {text.slice(0, start)}
        <span className="font-semibold text-incogni-text">{text.slice(start, end)}</span>
        {text.slice(end)}
      </span>
    );
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto" ref={containerRef}>
      <div className="relative flex items-center">
        <Search className="absolute left-4 h-5 w-5 text-incogni-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          className="w-full rounded-full border border-incogni-border bg-incogni-surface py-3 pl-12 pr-12 text-base text-incogni-text placeholder:text-incogni-muted focus:border-incogni-text focus:outline-none focus:ring-1 focus:ring-incogni-text transition-all shadow-sm"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="autocomplete-listbox"
          aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
        />
        {isLoading && (
          <Loader2 className="absolute right-4 h-5 w-5 animate-spin text-incogni-muted" />
        )}
      </div>

      {isOpen && (query.length > 0 || suggestions.length > 0) && (
        <div 
          id="autocomplete-listbox"
          role="listbox"
          className="absolute mt-2 w-full overflow-hidden rounded-2xl border border-incogni-border bg-incogni-surface-2 shadow-lg z-50 py-2"
        >
          {suggestions.length === 0 && !isLoading ? (
            <div className="px-4 py-3 text-sm text-incogni-muted text-center">
              No results — press Enter to search anyway
            </div>
          ) : (
            <ul>
              {suggestions.map((suggestion, idx) => {
                const isActive = idx === activeIndex;
                const isAI = suggestion.category === "ai";
                return (
                  <li
                    key={suggestion.text}
                    id={`suggestion-${idx}`}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(suggestion.text)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                      isActive ? "bg-incogni-bg text-incogni-text" : "text-incogni-muted hover:bg-incogni-bg hover:text-incogni-text"
                    )}
                  >
                    {isAI ? (
                      <Sparkles className="h-4 w-4 shrink-0 text-[#10a37f]" />
                    ) : (
                      <Clock className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1 truncate">
                      {renderHighlightedText(suggestion.text, suggestion.highlightRanges)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      
      {/* Screen reader announcement region */}
      <div aria-live="polite" className="sr-only">
        {isOpen ? `${suggestions.length} suggestions available.` : ""}
      </div>
    </div>
  );
}
