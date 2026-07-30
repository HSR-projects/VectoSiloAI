"use client";

import ReactMarkdown from "react-markdown";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, User as UserIcon, ShieldAlert, Send } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  isMalicious: boolean;
}

interface ForumPost {
  id: string;
  topicId: string;
  authorId: string;
  authorName: string;
  authorAvatarColor?: string;
  isAuthorChild?: boolean;
  content: string;
  createdAt: number;
  linkPreviews?: LinkPreviewData[];
}

interface ForumTopic {
  id: string;
  title: string;
  label: "Statement" | "Question";
  authorId: string;
  createdAt: number;
}

export default function TopicPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTopicAndPosts();
  }, [params.id]);

  async function fetchTopicAndPosts() {
    setLoading(true);
    try {
      const [topicRes, postsRes] = await Promise.all([
        fetch(`/api/forums/topics`), // Quick hack: fetch all and find, ideally we'd have a specific GET /topic/:id
        fetch(`/api/forums/posts?topicId=${params.id}`)
      ]);
      const topicData = await topicRes.json();
      const postsData = await postsRes.json();
      
      const found = topicData.topics?.find((t: any) => t.id === params.id);
      if (found) setTopic(found);
      if (postsData.posts) setPosts(postsData.posts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPosting(true);
    try {
      const res = await fetch("/api/forums/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: params.id, content: replyContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reply");
      
      setPosts([...posts, data.post]);
      setReplyContent("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  }

  // Format text to highlight links and parse AI bubbles
  const renderContent = (content: string) => {
    const parts = content.split(/(\[AI_GENERATED\][\s\S]*?\[\/AI_GENERATED\])/g);
    
    return parts.map((part, i) => {
      if (part.startsWith("[AI_GENERATED]") && part.endsWith("[/AI_GENERATED]")) {
        const aiText = part.replace("[AI_GENERATED]", "").replace("[/AI_GENERATED]", "").trim();
        return (
          <div key={i} className="my-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl rounded-tl-sm relative group">
            <div className="absolute -top-3 left-4 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> AI Generated
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none text-emerald-900 dark:text-emerald-100">
              <ReactMarkdown>{aiText}</ReactMarkdown>
            </div>
          </div>
        );
      }
      return (
        <div key={i} className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{part}</ReactMarkdown>
        </div>
      );
    });
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-4 animate-pulse">
      <div className="h-8 w-1/3 bg-muted/50 rounded-lg" />
      <div className="h-32 bg-muted/50 rounded-lg" />
    </div>;
  }

  if (!topic) {
    return <div className="max-w-5xl mx-auto p-4 md:p-8 text-center">Topic not found.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <Link href="/forums" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Forums
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${topic.label === 'Question' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
            {topic.label}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{topic.title}</h1>
        </div>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="flex flex-col md:flex-row gap-4 bg-card border rounded-lg overflow-hidden">
            <div className="md:w-48 bg-muted/20 p-4 border-b md:border-b-0 md:border-r flex flex-row md:flex-col items-center md:items-start gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: post.authorAvatarColor || "#888" }}
              >
                {post.authorName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold">{post.authorName}</div>
                {post.isAuthorChild && (
                  <div className="text-[10px] uppercase font-bold text-blue-500/80 tracking-wider">Child Account</div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(post.createdAt, { addSuffix: true })}
                </div>
              </div>
            </div>
            
            <div className="p-4 flex-1 whitespace-pre-wrap text-sm leading-relaxed">
              {renderContent(post.content)}

              {/* Link Previews */}
              {post.linkPreviews && post.linkPreviews.length > 0 && (
                <div className="mt-4 space-y-3">
                  {post.linkPreviews.map((preview, i) => (
                    preview.title && !preview.isMalicious ? (
                      <a key={i} href={preview.url} target="_blank" rel="noopener noreferrer" className="block max-w-md border rounded-lg overflow-hidden hover:bg-muted/30 transition-colors">
                        {preview.image && <img src={preview.image} alt={preview.title} className="w-full h-32 object-cover" />}
                        <div className="p-3">
                          <h4 className="font-semibold text-sm line-clamp-1">{preview.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{preview.description}</p>
                          <div className="text-[10px] text-muted-foreground mt-2 uppercase">{new URL(preview.url).hostname}</div>
                        </div>
                      </a>
                    ) : null
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {user ? (
        <form onSubmit={handleReply} className="bg-card border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Reply to Topic</h3>
          
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20"
                onClick={async () => {
                  setReplyContent((prev) => prev + (prev ? "\n\n" : "") + "[AI_GENERATED] Drafting... [/AI_GENERATED]");
                  try {
                    const res = await fetch("/api/forums/draft", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        prompt: `Write a short, helpful forum reply for the topic: "${topic.title}". Do not include greetings or sign-offs, just the core response.`
                      })
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    const text = data.text;
                    setReplyContent((prev) => prev.replace("[AI_GENERATED] Drafting... [/AI_GENERATED]", `[AI_GENERATED]\n${text}\n[/AI_GENERATED]`));
                  } catch (e) {
                    setReplyContent((prev) => prev.replace("[AI_GENERATED] Drafting... [/AI_GENERATED]", ""));
                    setError("Failed to generate AI draft.");
                  }
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5" /> Draft with AI (gpt-oss:20b)
              </Button>
            </div>
            <textarea
              required
              disabled={posting}
              placeholder="Write your reply... Emojis and links allowed. Use Markdown!"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="w-full bg-background border rounded-md px-3 py-2 text-sm min-h-[120px] resize-y disabled:opacity-50"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground max-w-sm">
              Free users consume tokens when posting. Be mindful of our community guidelines. Image uploads are intentionally disabled.
            </div>
            <Button type="submit" disabled={posting} className="gap-2">
              <Send className="w-4 h-4" />
              {posting ? "Posting..." : "Post Reply"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="bg-muted/30 border rounded-lg p-6 text-center text-muted-foreground">
          You must be logged in to reply to this topic.
        </div>
      )}
    </div>
  );
}
