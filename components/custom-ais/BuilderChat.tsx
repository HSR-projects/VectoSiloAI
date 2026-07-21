"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVectoSiloStore } from "@/lib/store";

interface BuilderChatProps {
  onUpdate: (updates: any) => void;
}

export function BuilderChat({ onUpdate }: BuilderChatProps) {
  const [messages, setMessages] = useState<{ role: "assistant" | "user"; content: string }[]>([
    { 
      role: "assistant", 
      content: "Hi! I'll help you build a new VectoSilo AI. You can say something like, \"make a creative who helps generate visuals for new products\" or \"make a software engineer who helps format my code.\"\n\nWhat would you like to make?"
    }
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedModel = useVectoSiloStore((s) => s.selectedModel);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg = { role: "user" as const, content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    
    try {
      const res = await fetch("/api/custom-ais/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, model: selectedModel })
      });
      
      if (!res.ok || !res.body) throw new Error("Stream failed");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let fullText = "";
      
      // Add a placeholder assistant message that we will update
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        fullText += decoder.decode(value, { stream: true });
        
        // Split by the separator
        const parts = fullText.split("====CONFIG====");
        const replyText = parts[0].trim();
        
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1].content = replyText;
          return updated;
        });
      }
      
      // Stream finished. Parse config if present.
      const finalParts = fullText.split("====CONFIG====");
      if (finalParts.length > 1) {
        try {
          const configStr = finalParts[1].trim();
          // Remove potential markdown blocks just in case
          const cleanConfigStr = configStr.replace(/^```json\n?/, "").replace(/```$/, "").trim();
          const config = JSON.parse(cleanConfigStr);
          onUpdate(config);
        } catch (e) {
          console.error("Failed to parse config from builder:", e, finalParts[1]);
        }
      }
    } catch (e) {
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1].role === "assistant" && !updated[updated.length - 1].content) {
           updated[updated.length - 1].content = "Oops, I encountered an error. Let's try again!";
        } else if (updated[updated.length - 1].role !== "assistant") {
           updated.push({ role: "assistant", content: "Oops, I encountered an error. Let's try again!" });
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-4 max-w-2xl mx-auto", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-vectosilo-surface border border-vectosilo-border flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-vectosilo-text" />
              </div>
            )}
            <div className={cn(
              "text-[15px] leading-relaxed whitespace-pre-wrap",
              m.role === "user" ? "bg-vectosilo-surface text-vectosilo-text px-4 py-2.5 rounded-2xl rounded-tr-sm border border-vectosilo-border shadow-sm" : "text-vectosilo-text py-2"
            )}>
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-2xl mx-auto justify-start">
             <div className="w-8 h-8 rounded-full bg-vectosilo-surface border border-vectosilo-border flex items-center justify-center shrink-0 mt-1">
               <Bot className="w-4 h-4 text-vectosilo-text animate-pulse" />
             </div>
             <div className="py-2 text-vectosilo-muted flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-vectosilo-muted animate-bounce" style={{ animationDelay: "0ms" }} />
               <span className="w-1.5 h-1.5 rounded-full bg-vectosilo-muted animate-bounce" style={{ animationDelay: "150ms" }} />
               <span className="w-1.5 h-1.5 rounded-full bg-vectosilo-muted animate-bounce" style={{ animationDelay: "300ms" }} />
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-vectosilo-bg sticky bottom-0">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="relative max-w-2xl mx-auto flex items-end gap-2 bg-vectosilo-surface border border-vectosilo-border shadow-sm rounded-3xl px-4 py-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message AI Builder..."
            className="flex-1 bg-transparent border-none focus:outline-none py-2 text-[15px] placeholder:text-vectosilo-muted min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2 bg-vectosilo-text text-vectosilo-bg rounded-full disabled:opacity-50 disabled:bg-vectosilo-muted transition-colors shrink-0 mb-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
