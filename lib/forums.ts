import { promises as fs } from "node:fs";
import path from "node:path";
import { uid } from "@/lib/utils";
import { User } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "forums.json");

export interface ForumTopic {
  id: string;
  title: string;
  label: "Statement" | "Question";
  authorId: string;
  createdAt: number;
  updatedAt: number;
  latestPostAt: number;
  /** Denormalized author info for faster rendering */
  authorName: string;
}

export interface ForumPost {
  id: string;
  topicId: string;
  authorId: string;
  content: string;
  createdAt: number;
  /** Denormalized author info */
  authorName: string;
  authorAvatarColor?: string;
  isAuthorChild?: boolean;
  linkPreviews?: any[];
}

interface ForumsDB {
  topics: ForumTopic[];
  posts: ForumPost[];
}

async function readDB(): Promise<ForumsDB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const db = JSON.parse(raw) as ForumsDB;
    if (!Array.isArray(db.topics)) db.topics = [];
    if (!Array.isArray(db.posts)) db.posts = [];
    return db;
  } catch {
    return { topics: [], posts: [] };
  }
}

async function writeDB(db: ForumsDB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function getTopics(): Promise<ForumTopic[]> {
  const db = await readDB();
  return db.topics.sort((a, b) => b.latestPostAt - a.latestPostAt);
}

export async function getTopic(id: string): Promise<ForumTopic | null> {
  const db = await readDB();
  return db.topics.find((t) => t.id === id) || null;
}

export async function getPosts(topicId: string): Promise<ForumPost[]> {
  const db = await readDB();
  return db.posts
    .filter((p) => p.topicId === topicId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function createTopic(
  title: string,
  label: "Statement" | "Question",
  content: string,
  author: User,
  linkPreviews?: any[]
): Promise<{ topic: ForumTopic; post: ForumPost }> {
  const db = await readDB();
  const now = Date.now();
  
  const topic: ForumTopic = {
    id: uid(),
    title,
    label,
    authorId: author.id,
    authorName: author.name,
    createdAt: now,
    updatedAt: now,
    latestPostAt: now,
  };
  
  const post: ForumPost = {
    id: uid(),
    topicId: topic.id,
    authorId: author.id,
    authorName: author.name,
    authorAvatarColor: author.avatarColor,
    isAuthorChild: author.isChild,
    content,
    createdAt: now,
    linkPreviews,
  };
  
  db.topics.push(topic);
  db.posts.push(post);
  await writeDB(db);
  
  return { topic, post };
}

export async function createPost(
  topicId: string,
  content: string,
  author: User,
  linkPreviews?: any[]
): Promise<ForumPost> {
  const db = await readDB();
  const topic = db.topics.find((t) => t.id === topicId);
  if (!topic) throw new Error("Topic not found");
  
  const now = Date.now();
  const post: ForumPost = {
    id: uid(),
    topicId,
    authorId: author.id,
    authorName: author.name,
    authorAvatarColor: author.avatarColor,
    isAuthorChild: author.isChild,
    content,
    createdAt: now,
    linkPreviews,
  };
  
  db.posts.push(post);
  
  // Update latest post timestamp
  topic.latestPostAt = now;
  topic.updatedAt = now;
  
  await writeDB(db);
  return post;
}
