import { getCurrentUser } from "@/lib/auth";
import { effectiveCaps, effectivePlan } from "@/lib/plans";
import {
  createContainer,
  destroyContainer,
  exec,
  getContainer,
  listContainers,
} from "@/lib/desktop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const plan = effectivePlan(user.plan);
  if (plan !== "ultra") {
    return new Response(
      JSON.stringify({ error: "Desktop sandbox requires Ultra plan." }),
      { status: 402 }
    );
  }

  let body: {
    action: "create" | "exec" | "destroy" | "list";
    containerId?: string;
    command?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body." }), { status: 400 });
  }

  try {
    switch (body.action) {
      case "create": {
        const container = await createContainer(user.id);
        return Response.json(container);
      }
      case "exec": {
        if (!body.containerId || !body.command) {
          return new Response(JSON.stringify({ error: "containerId and command required." }), { status: 400 });
        }
        const result = await exec(body.containerId, body.command);
        return Response.json(result);
      }
      case "destroy": {
        if (!body.containerId) {
          return new Response(JSON.stringify({ error: "containerId required." }), { status: 400 });
        }
        await destroyContainer(body.containerId);
        return Response.json({ ok: true });
      }
      case "list": {
        const containers = listContainers(user.id);
        return Response.json({ containers });
      }
      default:
        return new Response(JSON.stringify({ error: "Unknown action." }), { status: 400 });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 });
  }
}
