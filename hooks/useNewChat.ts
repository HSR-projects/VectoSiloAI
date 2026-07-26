"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIncogniStore } from "@/lib/store";

/**
 * Single source of truth for "start a new chat" action.
 * Every new-chat button in the app must call this hook's returned function.
 */
export function useNewChat() {
  const router = useRouter();
  const setActiveThread = useIncogniStore((s) => s.setActiveThread);

  const newChat = useCallback(() => {
    setActiveThread(null);
    router.push("/");
  }, [setActiveThread, router]);

  return newChat;
}
