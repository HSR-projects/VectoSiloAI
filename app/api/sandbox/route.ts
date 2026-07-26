import { getCurrentUser } from "@/lib/auth";
import { effectiveCaps } from "@/lib/plans";
import {
  createContainer,
  exec,
  writeFile,
  readFile,
  destroyContainer,
} from "@/lib/sandbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PREFIXES = [
  "curl -s 'https://chat.hsrprojects.org/api/templates/scaffold",
  "npm install",
  "npm run dev",
  "npm run build",
  "npm run preview",
  "python3 -m http.server",
  "mkdir",
  "cat",
  "echo",
  "ls",
  "bash"
];

function validateCommand(cmd: string): boolean {
  // Split by chaining operators
  const parts = cmd.split(/(?:&&|;|\b\|\|\b|\|)/).map(p => p.trim()).filter(Boolean);
  
  for (const part of parts) {
    let allowed = false;
    for (const prefix of ALLOWED_PREFIXES) {
      if (part.startsWith(prefix)) {
        allowed = true;
        break;
      }
    }
    if (!allowed) return false;
  }
  return true;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const caps = effectiveCaps(user?.plan ?? "free");

  if (!caps.computer) {
    return new Response(JSON.stringify({ error: "Sandbox requires Go plan or above." }), {
      status: 402,
    });
  }

  let body: {
    action: "create" | "exec" | "write" | "read" | "destroy";
    containerId?: string;
    command?: string;
    workdir?: string;
    path?: string;
    content?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body." }), { status: 400 });
  }

  try {
    switch (body.action) {
      case "create": {
        const containerId = await createContainer();
        return Response.json({ containerId });
      }
      case "exec": {
        if (!body.containerId || !body.command) {
          return new Response(JSON.stringify({ error: "containerId and command required." }), { status: 400 });
        }
        
        if (!validateCommand(body.command)) {
          return Response.json({ 
            stdout: "", 
            stderr: "Unauthorized Command. This sandbox is restricted to approved build operations only.", 
            exitCode: 126 
          });
        }

        const result = await exec(body.containerId, body.command, { workdir: body.workdir });
        return Response.json(result);
      }
      case "write": {
        if (!body.containerId || !body.path || body.content === undefined) {
          return new Response(JSON.stringify({ error: "containerId, path, and content required." }), { status: 400 });
        }
        await writeFile(body.containerId, body.path, body.content);
        return Response.json({ ok: true });
      }
      case "read": {
        if (!body.containerId || !body.path) {
          return new Response(JSON.stringify({ error: "containerId and path required." }), { status: 400 });
        }
        const content = await readFile(body.containerId, body.path);
        return Response.json({ content });
      }
      case "destroy": {
        if (!body.containerId) {
          return new Response(JSON.stringify({ error: "containerId required." }), { status: 400 });
        }
        await destroyContainer(body.containerId);
        return Response.json({ ok: true });
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown action." }), { status: 400 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
}
