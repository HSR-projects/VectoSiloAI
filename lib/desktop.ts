import { spawn } from "child_process";

const BASE_IMAGE = process.env.DESKTOP_IMAGE || "ubuntu:22.04";
const CONTAINER_TIMEOUT = +(
  process.env.DESKTOP_CONTAINER_TIMEOUT || "3600000"
);
const HOST = process.env.DESKTOP_HOST || "localhost";
const DISPLAY = ":99";

interface DesktopContainer {
  id: string;
  userId: string;
  createdAt: number;
  vncPort: number;
  noVncUrl: string;
}

const containers = new Map<string, DesktopContainer>();
let portCounter = 15900;

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getContainer(id: string): DesktopContainer | undefined {
  return containers.get(id);
}

export function listContainers(userId: string): DesktopContainer[] {
  return [...containers.values()].filter((c) => c.userId === userId);
}

export function exec(
  containerId: string,
  cmd: string,
  timeout = 60000
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("docker", [
      "exec", containerId, "sh", "-c", cmd,
    ], { timeout });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("close", (code) =>
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    );
    proc.on("error", reject);
  });
}

/** Capture the Xvfb display as a base64 PNG. */
export async function screenshot(containerId: string): Promise<string> {
  // Use ImageMagick's import to capture the virtual display
  const r = await exec(containerId, `DISPLAY=${DISPLAY} import -window root png:- | base64 -w0`, 15000).catch(() => ({ stdout: "", stderr: "import failed", exitCode: 1 }));
  if (r.exitCode !== 0 || !r.stdout) {
    throw new Error(r.stderr || "screenshot failed — is Xvfb running?");
  }
  return r.stdout.trim();
}

/** Type text into the focused window. */
export async function typeKeys(containerId: string, text: string): Promise<void> {
  // Escape special chars for xdotool
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  await exec(containerId, `DISPLAY=${DISPLAY} xdotool type --delay 12 "${escaped}"`, 30000);
}

/** Press a key or key combination (e.g. "Return", "ctrl+c", "Alt+Tab"). */
export async function pressKey(containerId: string, key: string): Promise<void> {
  await exec(containerId, `DISPLAY=${DISPLAY} xdotool key ${key}`, 10000);
}

/** Click at pixel coordinates (x, y). Button 1 = left, 2 = middle, 3 = right. */
export async function clickAt(
  containerId: string,
  x: number,
  y: number,
  button = 1
): Promise<void> {
  await exec(containerId, `DISPLAY=${DISPLAY} xdotool mousemove ${x} ${y} click ${button}`, 10000);
}

/** Get list of open window titles. */
export async function listWindows(containerId: string): Promise<string[]> {
  const r = await exec(containerId, `DISPLAY=${DISPLAY} xdotool search --onlyvisible --name ""`, 10000).catch(() => ({ stdout: "", exitCode: 0 }));
  if (!r.stdout.trim()) return [];
  const ids = r.stdout.trim().split("\n").filter(Boolean);
  const titles: string[] = [];
  for (const id of ids) {
    const t = await exec(containerId, `DISPLAY=${DISPLAY} xdotool getwindowname ${id}`, 5000).catch(() => ({ stdout: "" }));
    if (t.stdout.trim()) titles.push(t.stdout.trim());
  }
  return titles;
}

export async function createContainer(userId: string): Promise<DesktopContainer> {
  cleanupStale();

  const id = genId();
  const name = `incogni-desktop-${id}`;
  const vncPort = portCounter++;

  const startupScript = [
    "#!/bin/bash",
    "set -e",
    // Install packages
    "apt-get update -qq > /dev/null 2>&1",
    "apt-get install -y -qq gcc g++ python3 python3-pip nodejs npm make \\",
    "  xvfb x11vnc x11-utils xdotool fluxbox xterm novnc websockify imagemagick > /dev/null 2>&1 || true",
    // Start Xvfb
    "Xvfb :99 -screen 0 1280x720x24 -ac &",
    "sleep 0.5",
    // Start window manager
    "fluxbox &",
    "sleep 0.3",
    // Start VNC
    "x11vnc -display :99 -nopw -forever -shared -quiet &",
    "sleep 0.3",
    // Start noVNC web server + WebSocket proxy on port 8080
    "mkdir -p /workspace",
    "websockify --web /usr/share/novnc 0.0.0.0:8080 localhost:5900 &",
    // Keep alive
    `sleep ${CONTAINER_TIMEOUT / 1000 + 120}`,
  ].join("\n");

  const proc = spawn("docker", [
    "run",
    "-d",
    "--rm",
    "--name", name,
    "--memory", "1g",
    "--memory-swap", "1g",
    "--cpus", "2",
    "--pids-limit", "100",
    "-p", `${vncPort}:8080`,
    BASE_IMAGE,
    "sh", "-c", startupScript,
  ]);

  const containerId = await new Promise<string>((resolve, reject) => {
    let output = "";
    proc.stdout.on("data", (d: Buffer) => (output += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (output += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(output || "docker run failed"));
      resolve(output.trim());
    });
    proc.on("error", reject);
  });

  // Wait for noVNC to be ready
  for (let i = 0; i < 30; i++) {
    const r = await exec(containerId, "ss -tln | grep 8080 || true").catch(() => ({ stdout: "" }));
    if (r.stdout.includes("8080")) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  const container: DesktopContainer = {
    id: containerId,
    userId,
    createdAt: Date.now(),
    vncPort,
    noVncUrl: `http://${HOST}:${vncPort}/vnc.html`,
  };
  containers.set(containerId, container);
  return container;
}

export async function destroyContainer(containerId: string): Promise<void> {
  containers.delete(containerId);
  const proc = spawn("docker", ["rm", "-f", containerId]);
  return new Promise((resolve) => {
    proc.on("close", () => resolve());
  });
}

function cleanupStale(): void {
  const now = Date.now();
  for (const [id, c] of containers) {
    if (now - c.createdAt > CONTAINER_TIMEOUT) {
      destroyContainer(id);
    }
  }
}

setInterval(cleanupStale, 120_000);
