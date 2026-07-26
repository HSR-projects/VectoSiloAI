"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PreviewChatProps {
  name: string;
  avatarUrl?: string;
  description: string;
  instructions: string;
  starters: string[];
}

export function PreviewChat({ name, avatarUrl, description, instructions, starters }: PreviewChatProps) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    
    const userMsg = { role: "user" as const, content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "incogni-ai-auto",
          messages: [
            { role: "system", content: instructions || "You are a helpful assistant." },
            ...messages,
            userMsg
          ],
          stream: false
        })
      });
      
      const data = await res.json();
      if (data.choices?.[0]?.message) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.choices[0].message.content }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Error: Could not get response." }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to API." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-incogni-bg relative">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover mb-4 shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-incogni-surface border border-incogni-border flex items-center justify-center mb-4 shadow-sm">
              <Bot className="w-8 h-8 text-incogni-muted" />
            </div>
          )}
          <h2 className="text-xl font-semibold text-incogni-text">{name || "New AI"}</h2>
          {description && <p className="text-sm text-incogni-muted mt-2 max-w-sm">{description}</p>}
          
          {starters.filter(Boolean).length > 0 && (
            <div className="grid grid-cols-1 gap-2 mt-8 w-full max-w-md">
              {starters.filter(Boolean).map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="px-4 py-3 text-sm text-left bg-incogni-surface border border-incogni-border hover:border-incogni-accent hover:text-incogni-accent rounded-xl transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="flex flex-col items-center justify-center pt-4 pb-8 border-b border-incogni-border/50">
             {avatarUrl ? (
               <img src={avatarUrl} alt={name} className="w-12 h-12 rounded-full object-cover mb-2 shadow-sm" />
             ) : (
               <div className="w-12 h-12 rounded-full bg-incogni-surface border border-incogni-border flex items-center justify-center mb-2 shadow-sm">
                 <Bot className="w-6 h-6 text-incogni-muted" />
               </div>
             )}
             <h3 className="text-sm font-medium">{name || "New AI"}</h3>
             {description && <p className="text-xs text-incogni-muted mt-1 max-w-xs text-center">{description}</p>}
          </div>
          
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3 max-w-3xl mx-auto", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                avatarUrl ? (
                  <img src={avatarUrl} alt="AI" className="w-8 h-8 rounded-full object-cover shrink-0 mt-1 shadow-sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-incogni-surface border border-incogni-border flex items-center justify-center shrink-0 mt-1 shadow-sm">
                    <Bot className="w-4 h-4 text-incogni-muted" />
                  </div>
                )
              )}
              <div className={cn(
                "px-4 py-2.5 text-[15px] leading-relaxed shadow-sm",
                m.role === "user" ? "bg-incogni-surface text-incogni-text rounded-2xl rounded-tr-sm border border-incogni-border" : "bg-transparent text-incogni-text"
              )}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 max-w-3xl mx-auto">
               <div className="w-8 h-8 rounded-full bg-incogni-surface border border-incogni-border flex items-center justify-center shrink-0 mt-1 shadow-sm">
                 <Bot className="w-4 h-4 text-incogni-muted animate-pulse" />
               </div>
               <div className="px-4 py-2.5 text-incogni-muted flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-incogni-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                 <span className="w-1.5 h-1.5 rounded-full bg-incogni-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                 <span className="w-1.5 h-1.5 rounded-full bg-incogni-muted animate-bounce" style={{ animationDelay: "300ms" }} />
               </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="p-4 border-t border-incogni-border bg-incogni-bg">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
          className="relative max-w-3xl mx-auto flex items-end gap-2 bg-incogni-surface border border-incogni-border shadow-sm rounded-3xl px-4 py-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${name || "New AI"}...`}
            className="flex-1 bg-transparent border-none focus:outline-none py-2 text-[15px] placeholder:text-incogni-muted min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 bg-incogni-accent text-white rounded-full disabled:opacity-50 disabled:bg-incogni-surface disabled:text-incogni-muted transition-colors shrink-0 mb-1"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
