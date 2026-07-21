"use client";

import { useVectoSiloStore } from "@/lib/store";

/** Convenience accessor for a single thread + its CRUD operations. */
export function useThread(threadId: string | null) {
  const thread = useVectoSiloStore((s) =>
    threadId ? s.threads.find((t) => t.id === threadId) : undefined
  );
  const appendMessage = useVectoSiloStore((s) => s.appendMessage);
  const updateMessage = useVectoSiloStore((s) => s.updateMessage);
  const createThread = useVectoSiloStore((s) => s.createThread);
  const deleteThread = useVectoSiloStore((s) => s.deleteThread);
  const setActiveThread = useVectoSiloStore((s) => s.setActiveThread);

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
