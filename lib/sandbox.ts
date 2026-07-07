import { spawn } from "child_process";

const BASE_IMAGE = process.env.SANDBOX_IMAGE || "ubuntu:22.04";
const CONTAINER_TIMEOUT = +(
  process.env.SANDBOX_CONTAINER_TIMEOUT || "1800000"
); // 30 min

interface SandboxContainer {
  id: string;
  createdAt: number;
}

const containers = new Map<string, SandboxContainer>();

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function exec(
  containerId: string,
  cmd: string,
  opts?: { workdir?: string }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const workdir = opts?.workdir || "/workspace";
    const args = [
      "exec",
      "-w", workdir,
      "-e", "DEBIAN_FRONTEND=noninteractive",
      "-e", "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games",
      containerId,
      "sh", "-c",
      cmd,
    ];
    const proc = spawn("docker", args, {
      timeout: 60000,
    });
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

export async function createContainer(): Promise<string> {
  cleanupStale();

  const id = genId();

  const proc = spawn("docker", [
    "run",
    "-d",
    "--rm",
    "--name", `koda-sandbox-${id}`,
    "-e", "DEBIAN_FRONTEND=noninteractive",
    "--memory", "512m",
    "--memory-swap", "512m",
    "--cpus", "1",
    "--pids-limit", "50",
    "-v", "/var/lib/lxcfs/proc/cpuinfo:/proc/cpuinfo:rw",
    "-v", "/var/lib/lxcfs/proc/diskstats:/proc/diskstats:rw",
    "-v", "/var/lib/lxcfs/proc/meminfo:/proc/meminfo:rw",
    "-v", "/var/lib/lxcfs/proc/stat:/proc/stat:rw",
    "-v", "/var/lib/lxcfs/proc/swaps:/proc/swaps:rw",
    "-v", "/var/lib/lxcfs/proc/uptime:/proc/uptime:rw",
    BASE_IMAGE,
    "sh", "-c",
    `sleep ${String(CONTAINER_TIMEOUT / 1000 + 60)}`,
  ]);

  const containerId = await new Promise<string>((resolve, reject) => {
    let output = "";
    proc.stdout.on("data", (d: Buffer) => (output += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (output += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(output || "docker run failed"));
      const cid = output.trim();
      containers.set(cid, { id: cid, createdAt: Date.now() });
      resolve(cid);
    });
    proc.on("error", reject);
  });

  // Enable universe repo (many packages like gnuchess live there)
  try {
    await exec(containerId,
      "sed -i 's/main restricted$/main restricted universe multiverse/' /etc/apt/sources.list " +
      "&& apt-get update -qq 2>/dev/null",
      { workdir: "/" }
    );
  } catch {}

  // Install common build tools (gcc, g++, python3, nodejs, make)
  try {
    await exec(containerId,
      "apt-get install -y -qq gcc g++ python3 nodejs npm make 2>/dev/null"
    );
  } catch {}

  // Ubuntu's nodejs installs as /usr/bin/nodejs; create /usr/bin/node symlink
  try {
    await exec(containerId,
      "ln -sf /usr/bin/nodejs /usr/bin/node 2>/dev/null || true",
      { workdir: "/" }
    );
  } catch {}

  // Ensure /workspace exists
  try {
    await exec(containerId, "mkdir -p /workspace", { workdir: "/" });
  } catch {
    // Non-fatal
  }

  // Install GUI packages (xvfb, x11vnc, fluxbox, novnc, etc.)
  try {
    await exec(containerId,
      "apt-get install -y -qq xvfb x11vnc fluxbox xterm novnc websockify netcat-openbsd 2>/dev/null",
      { workdir: "/" }
    );
  } catch {}

  // Start X11 + VNC services
  try {
    await exec(containerId,
      "Xvfb :99 -screen 0 1280x720x24 -ac & " +
      "sleep 0.5 && fluxbox & " +
      "sleep 0.3 && x11vnc -display :99 -nopw -forever -shared -quiet & " +
      "sleep 0.3 && websockify --web /usr/share/novnc 0.0.0.0:8080 localhost:5900 &",
      { workdir: "/" }
    );
  } catch {}

  return containerId;
}

export async function writeFile(
  containerId: string,
  path: string,
  content: string
): Promise<void> {
  const proc = spawn("docker", [
    "exec",
    "-i",
    containerId,
    "sh",
    "-c",
    `mkdir -p "$(dirname '${path}')" && cat > '${path}'`,
  ]);
  proc.stdin.write(content);
  proc.stdin.end();

  return new Promise((resolve, reject) => {
    let err = "";
    proc.stderr.on("data", (d: Buffer) => (err += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(err || "write file failed"));
      else resolve();
    });
    proc.on("error", reject);
  });
}

export async function readFile(
  containerId: string,
  path: string
): Promise<string> {
  const proc = spawn("docker", ["exec", containerId, "cat", path]);
  return new Promise((resolve, reject) => {
    let out = "";
    let err = "";
    proc.stdout.on("data", (d: Buffer) => (out += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (err += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) reject(new Error(err || "read file failed"));
      else resolve(out);
    });
    proc.on("error", reject);
  });
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
