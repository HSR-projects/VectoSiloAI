"use client";
import { openDB } from "idb";
import type { Suggestion } from "./useAutocomplete";

const DB_NAME = "incogniai_search_db";
const STORE_NAME = "recent_searches";

export function useLocalSearchHistory() {
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
