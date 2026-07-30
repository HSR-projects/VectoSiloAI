import { NextRequest, NextResponse } from "next/server";
import { getTopics, createTopic } from "@/lib/forums";
import { getCurrentUser } from "@/lib/auth";
import { checkContent } from "@/lib/badWords";
import { extractUrls, verifyAndPreviewLink } from "@/lib/verifyLink";
import { readDB, writeDB } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const topics = await getTopics();
    return NextResponse.json({ topics });
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
    const { title, label, content } = body;

    if (!title || !label || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    
    if (label !== "Statement" && label !== "Question") {
      return NextResponse.json({ error: "Invalid label" }, { status: 400 });
    }

    // Free users logic for token checks will be handled similarly
    if (user.plan === "free") {
      if ((user.forumTokens ?? 0) <= 0) {
        // Ensure 6-month wait time
        const resetAt = user.forumTokensResetAt || 0;
        const now = Date.now();
        if (now < resetAt) {
          return NextResponse.json({ error: "Out of tokens. Upgrade to post unlimited." }, { status: 403 });
        }
      }
    }

    // Content Check (Moderation)
    const titleCheck = checkContent(title);
    if (!titleCheck.ok) {
      return NextResponse.json({ error: "Title contains blocked phrases." }, { status: 400 });
    }

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

    const result = await createTopic(title, label, content, user, linkPreviews);
    
    return NextResponse.json({ topic: result.topic, post: result.post });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
