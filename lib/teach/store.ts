// @ts-nocheck
/**
 * Teachable Machine - Project store and management
 * Handles CRUD for ML projects, plan gating (5 free), and discover sharing.
 */

import fs from "fs";
import path from "path";

const DATA_DIR = process.env.TEACH_DATA_DIR || path.join(process.cwd(), "data", "teach");

export interface TeachProject {
  id: string;
  userId: string;
  name: string;
  description: string;
  type: "image" | "audio" | "pose";
  classes: TeachClass[];
  createdAt: number;
  updatedAt: number;
  trained: boolean;
  published: boolean;
  trainedModelPath?: string;
}

export interface TeachClass {
  id: string;
  name: string;
  sampleCount: number;
}

export interface TeachSample {
  id: string;
  classId: string;
  projectId: string;
  filePath: string;
  timestamp: number;
}

export interface DiscoverEntry {
  projectId: string;
  userId: string;
  username: string;
  name: string;
  description: string;
  type: string;
  classes: string[];
  sampleCount: number;
  downloads: number;
  likes: number;
  trained: boolean;
  createdAt: number;
}

const FREE_PROJECT_LIMIT = 5;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.mkdirSync(path.join(DATA_DIR, "projects"), { recursive: true });
    fs.mkdirSync(path.join(DATA_DIR, "samples"), { recursive: true });
    fs.mkdirSync(path.join(DATA_DIR, "models"), { recursive: true });
    fs.mkdirSync(path.join(DATA_DIR, "discover"), { recursive: true });
  }
}

function projectPath(userId: string, projectId: string): string {
  return path.join(DATA_DIR, "projects", userId, `${projectId}.json`);
}

function userProjectsDir(userId: string): string {
  const dir = path.join(DATA_DIR, "projects", userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function samplesDir(projectId: string): string {
  const dir = path.join(DATA_DIR, "samples", projectId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function modelDir(projectId: string): string {
  const dir = path.join(DATA_DIR, "models", projectId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function discoverPath(): string {
  return path.join(DATA_DIR, "discover", "entries.json");
}

export function getProjectCount(userId: string): number {
  ensureDir();
  const dir = userProjectsDir(userId);
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).length;
}

export function canCreateProject(userId: string, plan: string): { allowed: boolean; reason?: string } {
  if (plan !== "free") return { allowed: true };
  const count = getProjectCount(userId);
  if (count >= FREE_PROJECT_LIMIT) {
    return { allowed: false, reason: `Free plan limited to ${FREE_PROJECT_LIMIT} projects. Upgrade for unlimited.` };
  }
  return { allowed: true };
}

export function createProject(userId: string, data: { name: string; description?: string; type: string }): TeachProject {
  ensureDir();
  const project: TeachProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    name: data.name,
    description: data.description || "",
    type: data.type as any,
    classes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    trained: false,
    published: false,
  };
  const dir = userProjectsDir(userId);
  fs.writeFileSync(path.join(dir, `${project.id}.json`), JSON.stringify(project, null, 2));
  samplesDir(project.id);
  return project;
}

export function getProject(userId: string, projectId: string): TeachProject | null {
  ensureDir();
  const fp = projectPath(userId, projectId);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, "utf-8"));
}

export function getUserProjects(userId: string): TeachProject[] {
  ensureDir();
  const dir = userProjectsDir(userId);
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function updateProject(project: TeachProject): void {
  ensureDir();
  project.updatedAt = Date.now();
  const fp = projectPath(project.userId, project.id);
  fs.writeFileSync(fp, JSON.stringify(project, null, 2));
}

export function deleteProject(userId: string, projectId: string): boolean {
  ensureDir();
  const fp = projectPath(userId, projectId);
  if (!fs.existsSync(fp)) return false;
  fs.unlinkSync(fp);
  // Remove samples
  const sDir = samplesDir(projectId);
  if (fs.existsSync(sDir)) fs.rmSync(sDir, { recursive: true });
  // Remove model
  const mDir = modelDir(projectId);
  if (fs.existsSync(mDir)) fs.rmSync(mDir, { recursive: true });
  return true;
}

export function addClass(project: TeachProject, className: string): TeachClass {
  const cls: TeachClass = {
    id: `cls_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: className,
    sampleCount: 0,
  };
  project.classes.push(cls);
  updateProject(project);
  return cls;
}

export function removeClass(project: TeachProject, classId: string): void {
  project.classes = project.classes.filter((c) => c.id !== classId);
  updateProject(project);
}

export function saveSample(projectId: string, classId: string, buffer: Buffer, ext: string): TeachSample {
  const sDir = samplesDir(projectId);
  const sampleId = `smp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const filePath = path.join(sDir, `${sampleId}.${ext}`);
  fs.writeFileSync(filePath, buffer);

  const sample: TeachSample = {
    id: sampleId,
    classId,
    projectId,
    filePath,
    timestamp: Date.now(),
  };
  const metaPath = path.join(sDir, `${sampleId}.json`);
  fs.writeFileSync(metaPath, JSON.stringify(sample));
  return sample;
}

export function getClassSamples(projectId: string, classId: string): TeachSample[] {
  const sDir = samplesDir(projectId);
  if (!fs.existsSync(sDir)) return [];
  return fs.readdirSync(sDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(sDir, f), "utf-8")))
    .filter((s) => s.classId === classId);
}

export function getSampleById(sampleId: string): TeachSample | null {
  // Search all project sample dirs
  const projectsDir = path.join(DATA_DIR, "samples");
  if (!fs.existsSync(projectsDir)) return null;
  for (const projDir of fs.readdirSync(projectsDir)) {
    const sDir = path.join(projectsDir, projDir);
    if (!fs.statSync(sDir).isDirectory()) continue;
    for (const f of fs.readdirSync(sDir)) {
      if (f.endsWith(".json") && f.startsWith(sampleId)) {
        return JSON.parse(fs.readFileSync(path.join(sDir, f), "utf-8"));
      }
    }
  }
  return null;
}

export function getProjectSamples(projectId: string): TeachSample[] {
  const sDir = samplesDir(projectId);
  if (!fs.existsSync(sDir)) return [];
  return fs.readdirSync(sDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(sDir, f), "utf-8")));
}

export function publishProject(userId: string, projectId: string, username: string): boolean {
  const proj = getProject(userId, projectId);
  if (!proj || !proj.trained) return false;
  proj.published = !proj.published;
  updateProject(proj);

  if (proj.published) {
    const entries = getDiscoverEntries();
    const existing = entries.findIndex((e) => e.projectId === projectId);
    const entry: DiscoverEntry = {
      projectId,
      userId,
      username,
      name: proj.name,
      description: proj.description,
      type: proj.type,
      classes: proj.classes.map((c) => c.name),
      sampleCount: proj.classes.reduce((sum, c) => sum + c.sampleCount, 0),
      downloads: 0,
      likes: 0,
      trained: true,
      createdAt: Date.now(),
    };
    if (existing >= 0) entries[existing] = entry;
    else entries.push(entry);
    saveDiscoverEntries(entries);
  }
  return true;
}

export function getDiscoverEntries(): DiscoverEntry[] {
  ensureDir();
  const fp = discoverPath();
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, "utf-8")).sort((a, b) => b.likes - a.likes);
}

function saveDiscoverEntries(entries: DiscoverEntry[]): void {
  fs.writeFileSync(discoverPath(), JSON.stringify(entries, null, 2));
}

export function likeDiscover(projectId: string): void {
  const entries = getDiscoverEntries();
  const entry = entries.find((e) => e.projectId === projectId);
  if (entry) {
    entry.likes++;
    saveDiscoverEntries(entries);
  }
}

export function incrementDownload(projectId: string): void {
  const entries = getDiscoverEntries();
  const entry = entries.find((e) => e.projectId === projectId);
  if (entry) {
    entry.downloads++;
    saveDiscoverEntries(entries);
  }
}
