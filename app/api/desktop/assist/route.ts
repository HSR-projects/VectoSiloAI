import { getCurrentUser } from "@/lib/auth";
import { effectivePlan } from "@/lib/plans";
import { chatStream, DEFAULT_MODEL } from "@/lib/ollama";
import {
  getContainer,
  screenshot,
  typeKeys,
  pressKey,
  clickAt,
  listWindows,
  exec,
} from "@/lib/desktop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ASSIST_SYSTEM =
  "You are an AI assistant inside the user's Linux desktop sandbox (Docker container). " +
  "Your goal: help them accomplish a task by running commands and, optionally, controlling the GUI.\n\n" +
  "AVAILABLE ACTIONS (one per response):\n" +
  "- `exec: <shell command>` — Run ANY shell command (install, compile, edit, run). Output comes back immediately. This is your PRIMARY tool — use it for everything unless you have a reason not to.\n" +
  "- `type: <text>` — Type text into the currently focused GUI window\n" +
  "- `key: <keys>` — Press keys (e.g. `Return`, `ctrl+c`, `Alt+Tab`)\n" +
  "- `click: <x> <y> [button]` — Click at GUI coordinates (button: 1=left, 2=middle, 3=right)\n" +
  "- `done: <summary>` — The task is complete\n\n" +
  "HOW IT WORKS:\n" +
  "• A screenshot of the desktop may be included with each turn. If present, use it to understand GUI state. If absent, don't pretend you can see anything — just use `exec:` instead.\n" +
  "• `exec:` is ALWAYS available and ALWAYS preferred. The desktop has a full Linux environment with gcc, g++, python3, node, npm, make, apt, and standard tools. Do NOT click around to open a terminal — just run `exec:` commands directly.\n" +
  "• When you use `exec:`, you get the command output. Use that to decide what to do next.\n" +
  "• GUI actions (`type:`, `key:`, `click:`) are ONLY for situations that genuinely need them (e.g. testing a GUI app you built). Do NOT use them for things `exec:` can do.\n" +
  "• If the user asks about the terminal or shell, just say OK and use `exec:` — that IS the terminal.\n" +
  "• Emit ONE action per response. Wait for the result, then decide the next step. Repeat until done.\n" +
  "• If something fails, try a different approach or explain why.\n" +
  "• Don't narrate your thought process unless it helps the user. Just take actions and report results.\n" +
  "Be helpful, efficient, and precise.";

function parseAction(
  text: string
): { type: "type" | "key" | "click" | "exec" | "done" | "screenshot" | "windows"; args: string[] } | null {
  const lines = text.trim().split("\n");
  for (const line of lines) {
    const trimmed = line.trim();

    const typeMatch = trimmed.match(/^type:\s*(.+)$/i);
    if (typeMatch) return { type: "type", args: [typeMatch[1]] };

    const keyMatch = trimmed.match(/^key:\s*(.+)$/i);
    if (keyMatch) return { type: "key", args: [keyMatch[1]] };

    const clickMatch = trimmed.match(/^click:\s*(\d+)\s*(\d+)\s*(\d+)?$/i);
    if (clickMatch) return { type: "click", args: [clickMatch[1], clickMatch[2], clickMatch[3] || "1"] };

    const execMatch = trimmed.match(/^exec:\s*(.+)$/i);
    if (execMatch) return { type: "exec", args: [execMatch[1]] };

    const doneMatch = trimmed.match(/^done:\s*(.+)?$/i);
    if (doneMatch) return { type: "done", args: [doneMatch[1] || ""] };
  }
  return null;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const plan = effectivePlan(user.plan);
  if (plan !== "ultra") {
    return new Response(JSON.stringify({ error: "Requires Ultra plan." }), { status: 402 });
  }

  let body: {
    containerId: string;
    query: string;
    screenshot?: string;
    history?: { role: string; content: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body." }), { status: 400 });
  }

  const { containerId, query, screenshot: initialScreenshot, history = [] } = body;
  const container = getContainer(containerId);
  if (!container) {
    return new Response(JSON.stringify({ error: "Container not found." }), { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const push = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: data })}\n\n`));
        } catch {}
      };

      // Take initial screenshot if not provided
      let currentScreenshot = initialScreenshot || "";
      if (!currentScreenshot) {
        try {
          currentScreenshot = await screenshot(containerId);
        } catch {}
      }

      // Build message history
      const messages: { role: string; content: string; images?: string[] }[] = [
        { role: "system", content: ASSIST_SYSTEM },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      if (currentScreenshot) {
        // Get window titles too
        let windowInfo = "";
        try {
          const windows = await listWindows(containerId);
          if (windows.length) windowInfo = `\nOpen windows: ${windows.join(", ")}`;
        } catch {}

        messages.push({
          role: "user",
          content: `[Desktop screenshot attached]${windowInfo}\n\nUser request: ${query}\n\n` +
            `Respond with ONE action from: type:, key:, click:, exec:, done:`,
          images: [currentScreenshot],
        });
      } else {
        messages.push({
          role: "user",
          content: `User request: ${query}\n\n` +
            `Respond with ONE action from: type:, key:, click:, exec:, done:`,
        });
      }

      // Run a limited agent loop — up to 20 steps
      let fullResponse = "";
      let accumulated = "";

      for (let step = 0; step < 20; step++) {
        accumulated = "";

        // Call the AI
        try {
          for await (const token of chatStream({
            model: DEFAULT_MODEL,
            messages: messages as any,
            options: { temperature: 0.1 },
          })) {
            accumulated += token;
            push(token);
          }
        } catch (e) {
          push(`\n[AI error: ${(e as Error).message}]\n`);
          break;
        }

        fullResponse += accumulated;
        const action = parseAction(accumulated);

        if (!action) {
          push("\n[No valid action found — stopping]\n");
          break;
        }

        if (action.type === "done") {
          push("\n[Done]\n");
          break;
        }

        // Execute the action
        let result = "";
        try {
          switch (action.type) {
            case "type":
              await typeKeys(containerId, action.args[0]);
              result = "✓ typed";
              break;
            case "key":
              await pressKey(containerId, action.args[0]);
              result = `✓ pressed ${action.args[0]}`;
              break;
            case "click":
              await clickAt(containerId, parseInt(action.args[0]), parseInt(action.args[1]), parseInt(action.args[2]));
              result = `✓ clicked (${action.args[0]}, ${action.args[1]})`;
              break;
            case "exec": {
              const r = await exec(containerId, action.args[0], 30000);
              result = r.stdout || r.stderr || `exit: ${r.exitCode}`;
              break;
            }
            case "screenshot":
              result = "use screenshot from observation";
              break;
            case "windows": {
              const w = await listWindows(containerId);
              result = w.length ? `Windows: ${w.join(", ")}` : "No windows found";
              break;
            }
          }
        } catch (e) {
          result = `Error: ${(e as Error).message}`;
        }

        // Take new screenshot after action
        let newScreenshot = "";
        try {
          newScreenshot = await screenshot(containerId);
        } catch {}

        let windowInfo = "";
        try {
          const windows = await listWindows(containerId);
          if (windows.length) windowInfo = `\nOpen windows: ${windows.join(", ")}`;
        } catch {}

        // Add to message history for next iteration
        messages.push({ role: "assistant", content: accumulated });
        messages.push({
          role: "user",
          content: `Action result: ${result}${windowInfo}\n\nWhat's the next step? Respond with ONE action.`,
          ...(newScreenshot ? { images: [newScreenshot] } : {}),
        });

        push(`\n[${result}]\n`);
        await new Promise((r) => setTimeout(r, 500));
      }

      push("\n[Done]\n");
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
