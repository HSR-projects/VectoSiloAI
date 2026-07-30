"use client";
import { useState, useEffect, useRef } from "react";
import { useLocalSearchHistory } from "./useLocalSearchHistory";

export interface Suggestion {
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

export function useAutocomplete(query: string) {
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
