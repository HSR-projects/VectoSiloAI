import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProjectFile } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "published.json");

export interface PublishedProject {
  slug: string;
  title: string;
  files: ProjectFile[];
  commands: string[];
  userId: string;
  createdAt: number;
}

interface DB {
  projects: PublishedProject[];
}

async function load(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { projects: [] };
  }
}

async function save(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export async function slugExists(slug: string): Promise<boolean> {
  const db = await load();
  return db.projects.some((p) => p.slug === slug);
}

export async function publishProject(
  slug: string,
  title: string,
  files: ProjectFile[],
  commands: string[],
  userId: string
): Promise<PublishedProject> {
  const db = await load();
  const existing = db.projects.findIndex((p) => p.slug === slug);
  const project: PublishedProject = {
    slug,
    title,
    files,
    commands,
    userId,
    createdAt: Date.now(),
  };
  if (existing >= 0) {
    db.projects[existing] = project;
  } else {
    db.projects.push(project);
  }
  await save(db);
  return project;
}

export async function getPublished(slug: string): Promise<PublishedProject | null> {
  const db = await load();
  return db.projects.find((p) => p.slug === slug) ?? null;
}
