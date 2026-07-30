import { NextRequest, NextResponse } from "next/server";
import { getPosts, createPost, getTopic } from "@/lib/forums";
import { readDB, writeDB, getCurrentUser } from "@/lib/auth";
import { checkContent } from "@/lib/badWords";
import { extractUrls, verifyAndPreviewLink } from "@/lib/verifyLink";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const topicId = url.searchParams.get("topicId");
    
    if (!topicId) {
      return NextResponse.json({ error: "Missing topicId" }, { status: 400 });
    }
    
    const posts = await getPosts(topicId);
    return NextResponse.json({ posts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { topicId, content } = body;

    if (!topicId || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const topic = await getTopic(topicId);
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // Token check and deduction for free users
    if (user.plan === "free") {
      const authDb = await readDB();
      const storedUser = authDb.users.find(u => u.id === user.id);
      
      if (!storedUser) {
         return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Initialize tokens if they don't have them
      if (storedUser.forumTokens === undefined) {
         storedUser.forumTokens = 100; // E.g., 100 tokens representing $1
      }
      
      const now = Date.now();
      const resetAt = storedUser.forumTokensResetAt || 0;

      if (storedUser.forumTokens <= 0) {
        if (now < resetAt) {
          return NextResponse.json({ error: "Out of tokens. Upgrade to post unlimited or wait until reset." }, { status: 403 });
        } else {
          // Reset tokens after 6 months wait
          storedUser.forumTokens = 100;
          storedUser.forumTokensResetAt = 0;
        }
      }

      // Deduct 1 token for the post (simulating AI cost)
      storedUser.forumTokens -= 1;
      
      // If tokens reach 0, set reset time to 6 months from now
      if (storedUser.forumTokens <= 0) {
         storedUser.forumTokensResetAt = now + 6 * 30 * 24 * 60 * 60 * 1000;
      }

      await writeDB(authDb);
    }

    // Moderation: Check for threatening words
    const contentCheck = checkContent(content);
    if (!contentCheck.ok) {
      return NextResponse.json({ error: "Content contains blocked phrases." }, { status: 400 });
    }

    // Link parsing & Malicious check
    const urls = extractUrls(content);
    const linkPreviews = [];
    for (const url of urls) {
       const preview = await verifyAndPreviewLink(url);
       if (preview.isMalicious) {
         return NextResponse.json({ error: `Malicious link blocked: ${url}` }, { status: 400 });
       }
       linkPreviews.push(preview);
    }

    const post = await createPost(topicId, content, user, linkPreviews);
    
    return NextResponse.json({ post });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
