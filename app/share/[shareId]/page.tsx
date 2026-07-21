"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, MessageSquare, Clock, User } from "lucide-react";
import type { Thread } from "@/types";
import { relativeTime } from "@/lib/utils";

export default function SharedThreadPage() {
  const params = useParams();
  const shareId = params?.shareId as string;
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shareId) return;
    fetch(`/api/shares/${shareId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setThread(data.thread);
      })
      .catch(() => setError("Could not load shared conversation."))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-vectosilo-bg">
        <Loader2 className="h-8 w-8 animate-spin text-vectosilo-muted" />
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-vectosilo-bg gap-3">
        <MessageSquare className="h-12 w-12 text-vectosilo-muted" />
        <p className="text-sm text-vectosilo-muted">{error || "Conversation not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-vectosilo-bg">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="mb-8 border-b border-vectosilo-border pb-4">
          <div className="flex items-center gap-2 text-xs text-vectosilo-muted mb-2">
            <User className="h-3.5 w-3.5" />
            Shared conversation
            <Clock className="h-3.5 w-3.5 ml-2" />
            {relativeTime(thread.createdAt)}
          </div>
          <h1 className="text-xl font-semibold text-vectosilo-text">{thread.title}</h1>
        </div>

        {/* Messages */}
        <div className="space-y-6">
          {thread.messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <p className="text-xs font-semibold text-vectosilo-muted uppercase tracking-wider">
                {msg.role === "user" ? "You" : "VectoSilo AI"}
              </p>
              <div
                className={`prose prose-invert max-w-none text-sm leading-relaxed ${
                  msg.role === "user" ? "text-vectosilo-text" : "text-vectosilo-text/90"
                }`}
              >
                {msg.content.split("\n").map((line, i) => (
                  <p key={i} className={line.trim() ? "mb-2" : "mb-2"}>{line || "\u00A0"}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-vectosilo-border pt-6 text-center">
          <p className="text-xs text-vectosilo-muted">
            Powered by <span className="text-vectosilo-accent">VectoSilo AI</span>
          </p>
        </div>
      </div>
    </div>
  );
}
