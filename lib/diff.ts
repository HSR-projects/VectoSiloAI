import type { DiffLine, FileDiff } from "@/types";

function lcs(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}

export function computeFileDiff(oldContent: string, newContent: string): DiffLine[] {
  if (oldContent === newContent) return [];
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");
  const common = lcs(oldLines, newLines);
  const result: DiffLine[] = [];
  let oi = 0, ni = 0, ci = 0;
  while (oi < oldLines.length || ni < newLines.length) {
    if (ci < common.length && oldLines[oi] === common[ci] && newLines[ni] === common[ci]) {
      result.push({ type: "same", content: oldLines[oi] });
      oi++; ni++; ci++;
    } else if (oi < oldLines.length && (ci >= common.length || oldLines[oi] !== common[ci])) {
      result.push({ type: "del", content: oldLines[oi] });
      oi++;
    } else if (ni < newLines.length) {
      result.push({ type: "add", content: newLines[ni] });
      ni++;
    }
  }
  return result;
}

export function computeDiffs(
  baseFiles: { path: string; content: string }[],
  newFiles: { path: string; content: string }[]
): FileDiff[] {
  const baseMap = new Map(baseFiles.map((f) => [f.path, f.content]));
  const diffs: FileDiff[] = [];
  for (const f of newFiles) {
    const oldContent = baseMap.get(f.path);
    if (oldContent === undefined) {
      diffs.push({ path: f.path, lines: [{ type: "add", content: f.content }], type: "added" });
    } else if (oldContent !== f.content) {
      diffs.push({ path: f.path, lines: computeFileDiff(oldContent, f.content), type: "modified" });
    }
    baseMap.delete(f.path);
  }
  for (const [path, content] of baseMap) {
    if (content.length > 0) {
      diffs.push({
        path,
        lines: content.split("\n").map((l) => ({ type: "del", content: l })),
        type: "deleted",
      });
    }
  }
  return diffs;
}
