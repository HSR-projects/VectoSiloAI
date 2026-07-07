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
