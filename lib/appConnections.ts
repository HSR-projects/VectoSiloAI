import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Per-user "connected apps" store (currently just GitHub). Kept in its own JSON
 * file rather than the auth DB so connection tokens live separately from
 * credentials. Swap for a real DB later without touching callers.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "connections.json");

export interface GithubConnection {
  /** OAuth access token (server-only — never sent to the client). */
  accessToken: string;
  /** Granted scopes, comma-separated. */
  scope: string;
  /** GitHub login (username). */
  login: string;
  name?: string;
  avatarUrl?: string;
  connectedAt: number;
}

interface ConnRecord {
  github?: GithubConnection;
}

interface DB {
  [userId: string]: ConnRecord;
}

async function readDB(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const db = JSON.parse(raw) as DB;
    return db && typeof db === "object" ? db : {};
  } catch {
    return {};
  }
}

async function writeDB(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function getGithubConnection(
  userId: string
): Promise<GithubConnection | null> {
  const db = await readDB();
  return db[userId]?.github ?? null;
}

export async function setGithubConnection(
  userId: string,
  conn: GithubConnection
): Promise<void> {
  const db = await readDB();
  db[userId] = { ...db[userId], github: conn };
  await writeDB(db);
}

export async function clearGithubConnection(userId: string): Promise<void> {
  const db = await readDB();
  if (db[userId]) {
    delete db[userId].github;
    await writeDB(db);
  }
}
