import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { ShareLink, Thread } from "@/types";
import { readThreads } from "./threadsStorage";

const DATA_DIR = path.join(process.cwd(), "data");
const SHARES_PATH = path.join(DATA_DIR, "shares.json");

interface SharesDB {
  shares: ShareLink[];
}

async function readDB(): Promise<SharesDB> {
  try {
    const raw = await fs.readFile(SHARES_PATH, "utf8");
    return JSON.parse(raw) as SharesDB;
  } catch {
    return { shares: [] };
  }
}

async function writeDB(db: SharesDB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(SHARES_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function createShareLink(threadId: string, userId: string): Promise<ShareLink> {
  const db = await readDB();
  const existing = db.shares.find((s) => s.threadId === threadId);
  if (existing) return existing;

  const share: ShareLink = {
    id: randomBytes(10).toString("hex"),
    threadId,
    userId,
    createdAt: Date.now(),
  };
  db.shares.push(share);
  await writeDB(db);
  return share;
}

export async function getSharedThread(shareId: string): Promise<{ thread: Thread; sharedBy: string } | null> {
  const db = await readDB();
  const share = db.shares.find((s) => s.id === shareId);
  if (!share) return null;

  // Find the user's threads file
  const threads = await readThreads(share.userId);
  const thread = threads.find((t) => t.id === share.threadId);
  if (!thread) return null;

  // Only share content, not internal metadata like streaming state
  const cleanMessages = thread.messages.map((m) => ({
    ...m,
    streaming: undefined,
    error: undefined,
  }));

  return {
    thread: { ...thread, messages: cleanMessages },
    sharedBy: share.userId,
  };
}

export async function revokeShareLink(threadId: string, userId: string): Promise<void> {
  const db = await readDB();
  db.shares = db.shares.filter((s) => !(s.threadId === threadId && s.userId === userId));
  await writeDB(db);
}

export async function getShareByThread(threadId: string): Promise<ShareLink | null> {
  const db = await readDB();
  return db.shares.find((s) => s.threadId === threadId) ?? null;
}
