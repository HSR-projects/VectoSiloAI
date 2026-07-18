import { promises as fs } from "node:fs";
import path from "node:path";
import { PublicCustomAI } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "custom_ais.json");

interface CustomAIsDB {
  publicAIs: PublicCustomAI[];
}

export async function readCustomAIsDB(): Promise<CustomAIsDB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(raw) as CustomAIsDB;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return { publicAIs: [] };
    }
    throw err;
  }
}

export async function writeCustomAIsDB(db: CustomAIsDB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

export async function getPublicAIs(): Promise<PublicCustomAI[]> {
  const db = await readCustomAIsDB();
  // Return sorted by creation date (newest first)
  return db.publicAIs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function publishCustomAI(ai: PublicCustomAI): Promise<void> {
  const db = await readCustomAIsDB();
  
  const existingIndex = db.publicAIs.findIndex((a) => a.id === ai.id);
  if (existingIndex >= 0) {
    // Overwrite if it already exists (user editing their published AI)
    db.publicAIs[existingIndex] = ai;
  } else {
    // Add new
    db.publicAIs.push(ai);
  }
  
  await writeCustomAIsDB(db);
}
