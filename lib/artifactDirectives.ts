import { useVectoSiloStore } from "@/lib/store";
import {
  parseComputerDirective,
  parseComputerFiles,
  parseComputerCommands,
  parseWebsiteDirective,
  parseScaffoldDirective,
} from "@/lib/computerParser";
import { parseSlidesDirective, parseSlides } from "@/lib/slidesParser";
import { parseSheetDirective, parseSheets } from "@/lib/sheetsParser";
import { parseDocDirective, parseDocContent } from "@/lib/docParser";
import type { Message, ProjectFile } from "@/types";
import { computeDiffs } from "@/lib/diff";

/**
 * Shared handling for the "builder" directives (VectoSilo's Computer, Website,
 * Slides, Spreadsheet) so the normal chat stream AND the Agent Swarm synthesis
 * both open the same artifacts. Chess/image directives stay in useChat.
 */

export interface BuildState {
  allowComputer: boolean;
  computerOpened: boolean;
  computerTitle: string;
  baseFiles: ProjectFile[];
  slidesOpened: boolean;
  slidesTitle: string;
  slidesCap: number;
  sheetOpened: boolean;
  sheetTitle: string;
  websiteOpened: boolean;
  websiteTitle: string;
  docOpened: boolean;
  docTitle: string;
}

export function makeBuildState(
  opts: { computer?: boolean; slidesMax?: number },
  existing?: { title: string; files: ProjectFile[]; commands?: string[] } | null
): BuildState {
  return {
    allowComputer: !!opts.computer,
    computerOpened: false,
    computerTitle: existing?.title ?? "Project",
    baseFiles: existing?.files ?? [],
    slidesOpened: false,
    slidesTitle: "Presentation",
    slidesCap: opts.slidesMax ?? 20,
    sheetOpened: false,
    sheetTitle: "Workbook",
    websiteOpened: false,
    websiteTitle: "Website",
    docOpened: false,
    docTitle: "Document",
  };
}

/** Merge newly-emitted files over a base project (by path); keep base order. */
export function mergeProjectFiles(base: ProjectFile[], over: ProjectFile[]): ProjectFile[] {
  if (!base.length) return over;
  const map = new Map(base.map((f) => [f.path, f.content]));
  for (const f of over) map.set(f.path, f.content);
  return [...map].map(([path, content]) => ({ path, content }));
}

/** True if acc has <vectosilo-file> blocks but NOT from the context preamble. */
function hasNewFileBlocks(acc: string): boolean {
  return /<vectosilo-file\s+path=/i.test(acc);
}

/** Incrementally detect + stream builder artifacts from accumulated text. */
export function detectBuilds(acc: string, st: BuildState): void {
  const store = useVectoSiloStore.getState();

  // VectoSilo's Computer (Pro/Max only).
  if (st.allowComputer && !st.computerOpened) {
    const c = parseComputerDirective(acc);
    if (c) {
      st.computerOpened = true;
      st.computerTitle = c.title || st.computerTitle;
      store.openComputer(st.computerTitle);
      if (st.baseFiles.length) store.setComputerFiles(st.baseFiles);
    }
    // Auto-open when the model emits <vectosilo-file> blocks without re-emitting
    // the [[computer:...]] directive (common on follow-up edits).
    if (!st.computerOpened && st.baseFiles.length > 0 && hasNewFileBlocks(acc)) {
      st.computerOpened = true;
      store.openComputer(st.computerTitle);
      if (st.baseFiles.length) store.setComputerFiles(st.baseFiles);
    }
  }
  if (st.computerOpened) {
    const files = parseComputerFiles(acc);
    if (files.length) store.setComputerFiles(mergeProjectFiles(st.baseFiles, files));
    const cmds = parseComputerCommands(acc);
    if (cmds.length) store.setComputerCommands(cmds);
  }

  // Slides.
  if (!st.slidesOpened) {
    const sd = parseSlidesDirective(acc);
    if (sd) {
      st.slidesOpened = true;
      st.slidesTitle = sd.title;
      store.openSlides(sd.title);
    }
  }
  if (st.slidesOpened) {
    const parsed = parseSlides(acc).slice(0, st.slidesCap);
    if (parsed.length) store.setSlides(parsed);
  }

  // Spreadsheet.
  if (!st.sheetOpened) {
    const sh = parseSheetDirective(acc);
    if (sh) {
      st.sheetOpened = true;
      st.sheetTitle = sh.title;
      store.openWorkbook(sh.title);
    }
  }
  if (st.sheetOpened) {
    const tables = parseSheets(acc);
    if (tables.length) store.setWorkbookSheets(tables);
  }

  // Website (all tiers; shares the <vectosilo-file> format).
  if (!st.websiteOpened) {
    const w = parseWebsiteDirective(acc);
    if (w) {
      st.websiteOpened = true;
      st.websiteTitle = w.title;
      store.openWebsite(w.title);
    }
  }
  if (st.websiteOpened) {
    const wfiles = parseComputerFiles(acc);
    if (wfiles.length) store.setWebsiteFiles(wfiles);
  }

  // Doc (Markdown document, e.g. a generated prompt).
  if (!st.docOpened) {
    const d = parseDocDirective(acc);
    if (d) {
      st.docOpened = true;
      st.docTitle = d.title;
      store.openDoc(d.title);
    }
  }
  if (st.docOpened) {
    const content = parseDocContent(acc);
    if (content) store.setDocContent(content);
  }
}

export interface BuildFinalizeResult {
  /** Snapshot fields to persist on the assistant message. */
  patch: Pick<Message, "computer" | "slides" | "sheet" | "website" | "doc">;
  /** Present when a sandbox was built — caller runs the terminal animation. */
  computer?: { files: ProjectFile[]; commands: string[]; isEdit: boolean };
}

/** Finalize builder artifacts after the stream completes; returns the message snapshot. */
export function finalizeBuilds(
  acc: string,
  st: BuildState,
  existingCommands?: string[]
): BuildFinalizeResult {
  const store = useVectoSiloStore.getState();
  const patch: BuildFinalizeResult["patch"] = {};
  let computer: BuildFinalizeResult["computer"];

  // Also auto-open if streaming detection missed it (short responses, edge cases).
  if (!st.computerOpened && st.baseFiles.length > 0 && hasNewFileBlocks(acc)) {
    st.computerOpened = true;
  }

  if (st.computerOpened) {
    const finalFiles = mergeProjectFiles(st.baseFiles, parseComputerFiles(acc));
    const parsedCmds = parseComputerCommands(acc);
    const finalCmds = parsedCmds.length ? parsedCmds : existingCommands ?? [];
    if (finalFiles.length) store.setComputerFiles(finalFiles);
    if (finalCmds.length) store.setComputerCommands(finalCmds);
    const isEdit = st.baseFiles.length > 0 && parsedCmds.length === 0;
    const diffs = isEdit ? computeDiffs(st.baseFiles, finalFiles) : undefined;
    patch.computer = { title: st.computerTitle, files: finalFiles, commands: finalCmds, diffs };
    computer = { files: finalFiles, commands: finalCmds, isEdit };
  }

  if (st.slidesOpened) {
    const finalSlides = parseSlides(acc).slice(0, st.slidesCap);
    if (finalSlides.length) store.setSlides(finalSlides);
    store.setSlidesStatus("ready");
    patch.slides = { title: st.slidesTitle, slides: finalSlides, template: store.slides?.template };
  }

  if (st.sheetOpened) {
    const finalSheets = parseSheets(acc);
    if (finalSheets.length) store.setWorkbookSheets(finalSheets);
    store.setWorkbookStatus("ready");
    patch.sheet = { title: st.sheetTitle, sheets: finalSheets };
  }

  if (st.websiteOpened) {
    const finalWeb = parseComputerFiles(acc);
    if (finalWeb.length) store.setWebsiteFiles(finalWeb);
    store.setWebsiteStatus("ready");
    patch.website = { title: st.websiteTitle, files: finalWeb };
  }

  if (st.docOpened) {
    const finalDoc = parseDocContent(acc);
    if (finalDoc) store.setDocContent(finalDoc);
    store.setDocStatus("ready");
    patch.doc = { title: st.docTitle, content: finalDoc };
  }

  return { patch, computer };
}
