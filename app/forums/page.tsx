"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { PlusCircle, MessageSquare, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

interface Topic {
  id: string;
  title: string;
  label: "Statement" | "Question";
  authorId: string;
  authorName: string;
  createdAt: number;
  latestPostAt: number;
}

export default function ForumsPage() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLabel, setNewLabel] = useState<"Statement" | "Question">("Statement");
  const [newContent, setNewContent] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTopics();
  }, []);

  async function fetchTopics() {
    setLoading(true);
    try {
      const res = await fetch("/api/forums/topics");
      const data = await res.json();
      if (data.topics) setTopics(data.topics);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTopic(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/forums/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, label: newLabel, content: newContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create topic");
      
      setTopics([data.topic, ...topics]);
      setIsCreating(false);
      setNewTitle("");
      setNewContent("");
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IncogniAI Forums</h1>
          <p className="text-muted-foreground mt-1">Discuss AI, share prompts, and connect with developers.</p>
        </div>
        
        {user ? (
          <Button onClick={() => setIsCreating(!isCreating)} className="shrink-0 gap-2">
            <PlusCircle className="w-4 h-4" />
            New Topic
          </Button>
        ) : (
          <Button disabled className="shrink-0">Sign in to post</Button>
        )}
      </div>

      {isCreating && (
        <form onSubmit={handleCreateTopic} className="bg-card border rounded-lg p-6 space-y-4 animate-in fade-in slide-in-from-top-4">
          <h2 className="text-xl font-semibold">Create New Topic</h2>
          
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-4">
            <select
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value as "Statement" | "Question")}
              className="bg-background border rounded-md px-3 py-2 text-sm shrink-0"
            >
              <option value="Statement">Statement</option>
              <option value="Question">Question</option>
            </select>
            <input
              required
              type="text"
              placeholder="Topic Title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-background border rounded-md px-3 py-2 text-sm flex-1"
            />
          </div>

          <div className="flex flex-col space-y-2">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                onClick={async () => {
                  setNewContent((prev) => prev + (prev ? "\n\n" : "") + "[AI_GENERATED] Drafting... [/AI_GENERATED]");
                  try {
                    const res = await fetch("/api/forums/draft", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        prompt: `Write a short, engaging forum post about: "${newTitle || "A general topic"}". Do not include greetings or sign-offs.`
                      })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    const text = data.text;
                    setNewContent((prev) => prev.replace("[AI_GENERATED] Drafting... [/AI_GENERATED]", `[AI_GENERATED]\n${text}\n[/AI_GENERATED]`));
                  } catch (e) {
                    setNewContent((prev) => prev.replace("[AI_GENERATED] Drafting... [/AI_GENERATED]", ""));
                    setError("Failed to generate AI draft.");
                  }
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" /> Draft with AI (gpt-oss:20b)
              </Button>
            </div>
            <textarea
              required
              placeholder="Write your post here... Emojis and links are welcome! (Image uploads disabled). Use Markdown!"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full bg-background border rounded-md px-3 py-2 text-sm min-h-[150px] resize-y"
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button type="submit">Post Topic</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-card border rounded-lg">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No topics yet. Be the first to start a discussion!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {topics.map((topic) => (
            <Link 
              key={topic.id} 
              href={`/forums/${topic.id}`}
              className="group flex flex-col md:flex-row md:items-center gap-4 p-4 md:p-5 bg-card hover:bg-muted/50 border rounded-lg transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${topic.label === 'Question' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                    {topic.label}
                  </span>
                  <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                    {topic.title}
                  </h3>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-3">
                  <span className="font-medium text-foreground">{topic.authorName}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(topic.createdAt, { addSuffix: true })}</span>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground text-right shrink-0">
                Latest activity<br />
                {formatDistanceToNow(topic.latestPostAt, { addSuffix: true })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
