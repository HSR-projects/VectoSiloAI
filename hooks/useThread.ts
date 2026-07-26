"use client";

import { useIncogniStore } from "@/lib/store";

/** Convenience accessor for a single thread + its CRUD operations. */
export function useThread(threadId: string | null) {
  const thread = useIncogniStore((s) =>
    threadId ? s.threads.find((t) => t.id === threadId) : undefined
  );
  const appendMessage = useIncogniStore((s) => s.appendMessage);
  const updateMessage = useIncogniStore((s) => s.updateMessage);
  const createThread = useIncogniStore((s) => s.createThread);
  const deleteThread = useIncogniStore((s) => s.deleteThread);
  const setActiveThread = useIncogniStore((s) => s.setActiveThread);

  return {
    thread,
    messages: thread?.messages ?? [],
    appendMessage,
    updateMessage,
    createThread,
    deleteThread,
    setActiveThread,
  };
}
