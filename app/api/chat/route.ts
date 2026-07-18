import {
  chatStreamRich,
  chat,
  DEFAULT_MODEL,
  OllamaError,
} from "@/lib/ollama";
import { streamRichFromProvider } from "@/lib/providerRouter";
import { checkContent } from "@/lib/badWords";
import {
  SYSTEM_PROMPTS,
  BEHAVIORAL_INSTRUCTIONS,
  ENGINE_SECRECY,
  ARTIFACT_INSTRUCTIONS,
  COMPUTER_INSTRUCTIONS,
  COMPUTER_UPSELL,
  IMAGE_INSTRUCTIONS,
  IMAGE_UPSELL,
  PRODUCT_SEARCH_INSTRUCTIONS,
  slidesInstructions,
  SHEETS_INSTRUCTIONS,
  SVG_INSTRUCTIONS,
  WEBSITE_INSTRUCTIONS,
  DOC_INSTRUCTIONS,
  GITHUB_INSTRUCTIONS,
  MEMORY_INSTRUCTIONS,
  PAGE_OPEN_INSTRUCTIONS,
  TEMPLATE_INSTRUCTIONS,
  BRAND_IDENTITY,
  PLATFORM_INFO,
  buildSourceContext,
  buildFollowupPrompt,
} from "@/lib/prompts";
import { getCurrentUser, consumeMessage, buildMemoryContext, getUserMemory, getUserById } from "@/lib/auth";
import { getGithubConnection } from "@/lib/appConnections";
import { effectiveCaps } from "@/lib/plans";
import { analyzeChessQuery } from "@/lib/chessEngine";
import { searchImages } from "@/lib/searxng";
import type {
  ChatRequestBody,
  ChatStreamEvent,
  OllamaMessage,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON body.", { status: 400 });
  }

  // Handle WhatsApp-initiated requests: whatsappUserId in body means it's from WhatsApp bridge
  const whatsappUserId = (body as any).whatsappUserId as string | undefined;
  let currentUser = await getCurrentUser();
  let userPlan = currentUser?.plan ?? "free";

  if (whatsappUserId && !currentUser) {
    const waUser = await getUserById(whatsappUserId);
    if (waUser) {
      currentUser = waUser;
      userPlan = waUser.plan ?? "free";
    }
  }

  const {
    query,
    threadHistory = [],
    // Free users are always locked to the default model regardless of what the client sends.
    model: requestedModel = DEFAULT_MODEL,
    focusMode = "all",
    sources = [],
    images = [],
    // Internal calls (title/utility generation) don't count toward usage limits.
    internal = false,
    // Minimal-system pass (e.g. GitHub result summary) — no tool directives.
    plain = false,
    // Focused GitHub turn — emit a [[github:…]] directive, nothing else.
    githubInvoke = false,
    // Think mode — reason inside a <think> block before answering.
    think = false,
    // Provider routing
    provider: rawProvider,
    providerApiKey,
    providerBaseUrl,
    customInstructions,
    // Web search capability
    enableSearch = false,
  } = body;

  // ── Free-tier usage limit (rolling window) ──────────────────
  // Real user turns from Free accounts are metered; once exhausted they must
  // upgrade or wait for the window to reset. Internal/utility calls are exempt.
  if (currentUser && userPlan === "free" && !internal) {
    const usage = await consumeMessage(currentUser.id);
    if (!usage.allowed) {
      const hrs = Math.max(1, Math.ceil((usage.resetAt - Date.now()) / 3_600_000));
      const message = `You've used up your free messages for now. Upgrade to Pro or Max for much higher limits — or wait about ${hrs} hour${hrs === 1 ? "" : "s"} for your free quota to reset.`;
      return new Response(
        JSON.stringify({ error: message, limit: true, resetAt: usage.resetAt }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // The "auto" sentinel is resolved client-side; if it ever slips through,
  // fall back to the default model rather than sending a bogus id to Ollama.
  const safeRequested = requestedModel === "auto" ? DEFAULT_MODEL : requestedModel;
  const caps = effectiveCaps(userPlan);
  const model = caps.allModels ? safeRequested : DEFAULT_MODEL;

  const provider = rawProvider && rawProvider !== "kodaai" ? rawProvider : "kodaai";

  if (!query?.trim()) {
    return new Response("Missing query.", { status: 400 });
  }

  // Bad-word / harmful-content pre-screen (skip for internal utility calls).
  if (!internal) {
    const contentCheck = checkContent(query);
    if (!contentCheck.ok) {
      return new Response(
        JSON.stringify({ error: "This message is harmful and can't be shown.", blocked: true }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ── Build the message list ──────────────────────────────────
  // Image generation is Pro/Max only — Free users get an upsell notice so the
  // model declines and points them to upgrade instead of emitting a directive.
  const imageBlock = caps.imageGen ? IMAGE_INSTRUCTIONS : IMAGE_UPSELL;
  const computerBlock = caps.computer ? COMPUTER_INSTRUCTIONS : COMPUTER_UPSELL;
  const slidesBlock = slidesInstructions(caps.slidesMax);
  // GitHub actions are offered only when the signed-in user has connected GitHub.
  const githubConnected = currentUser ? !!(await getGithubConnection(currentUser.id)) : false;
  const githubBlock = !plain && githubConnected ? `\n\n${GITHUB_INSTRUCTIONS}` : "";
  // Focused GitHub turn: strip every other tool so the model just picks the
  // right action and emits its directive (or, if not connected, says to connect).
  let systemPrompt: string;
  if (githubInvoke) {
    systemPrompt = githubConnected
      ? `${BEHAVIORAL_INSTRUCTIONS}\n\n${BRAND_IDENTITY}\n\n${PLATFORM_INFO}\n\n${GITHUB_INSTRUCTIONS}\n\nThe user is invoking the GitHub app. Work out which SINGLE action they want and emit the matching [[github:ACTION]] directive (with its fenced JSON args) as the VERY FIRST characters of your reply, right now. Do not ask for confirmation and do not answer in prose — just emit the directive.`
      : `${BEHAVIORAL_INSTRUCTIONS}\n\n${BRAND_IDENTITY}\n\n${PLATFORM_INFO}\n\nThe user tried to use GitHub, but their GitHub account isn't connected. Briefly and warmly tell them to open Apps in the sidebar and connect GitHub first, then they can ask again.`;
  } else if (plain) {
    // The "plain" pass (e.g. summarising a GitHub result) drops every tool
    // directive so the model just writes prose and can't re-trigger an action.
    systemPrompt = `${SYSTEM_PROMPTS.nosearch}\n\n${ENGINE_SECRECY}\n\n${BEHAVIORAL_INSTRUCTIONS}\n\n${BRAND_IDENTITY}\n\n${PLATFORM_INFO}`;
  } else {
    // Personalization / long-term memory (only when the user enabled it).
    const mem = currentUser ? await getUserMemory(currentUser.id) : null;
    const memEnabled = !!mem?.memoryEnabled && !internal;
    const memContext = memEnabled && currentUser ? await buildMemoryContext(currentUser.id) : "";
    const memContextBlock = memContext ? `${memContext}\n\n` : "";
    const memoryBlock = memEnabled ? `\n\n${MEMORY_INSTRUCTIONS}` : "";
    // Think mode uses the model's NATIVE reasoning (think:true below), so no
    // prompt-level instruction is needed here.
    const customBlock = customInstructions ? `\n\n[Custom AI Persona/Instructions]:\n${customInstructions}` : "";
    systemPrompt = `${memContextBlock}${SYSTEM_PROMPTS[focusMode] ?? SYSTEM_PROMPTS.all}\n\n${ARTIFACT_INSTRUCTIONS}\n\n${computerBlock}\n\n${WEBSITE_INSTRUCTIONS}\n\n${slidesBlock}\n\n${SHEETS_INSTRUCTIONS}\n\n${DOC_INSTRUCTIONS}${githubBlock}${memoryBlock}\n\n${PAGE_OPEN_INSTRUCTIONS}\n\n${SVG_INSTRUCTIONS}\n\n${imageBlock}\n\n${PRODUCT_SEARCH_INSTRUCTIONS}\n\n${TEMPLATE_INSTRUCTIONS}\n\n${BEHAVIORAL_INSTRUCTIONS}\n\n${ENGINE_SECRECY}\n\n${BRAND_IDENTITY}\n\n${PLATFORM_INFO}${customBlock}\n\n── QUICK REFERENCE (emit directives as the VERY FIRST characters, no preamble) ──\n• Build an app/game/tool → [[computer:Title]] + <koda-file> + <koda-cmd>\n• Static website/page → [[website:Title]] + <koda-file>\n• Slides/presentation → [[slides:Title]] + <koda-slide>\n• Spreadsheet/sheet → [[sheet:Title]] + <koda-table>\n• Document/doc → [[doc:Title]] + <koda-doc>\n• Generate image → [[image: prompt → path]]\n• Run terminal command → [[computer:Terminal]] + <koda-cmd>\n• Build from templates → use template IDs (page-landing-*, page-dashboard-*, page-auth-*, etc.) to compose websites without writing full code`;
  }

  // ── Chess engine analysis (inject into system prompt if chess is mentioned) ──
  if (!internal && !plain && !githubInvoke) {
    const chessQuery = /\b(chess|checkmate|stalemate|opening|gambit|fen|e4|d5|n[fbfg]3|bc[1-5]|queens? gambit|kings? gambit|sicilian|ruy|italian|spanish|caro|pirc|scandinavian|alekhine)\b/i.test(query);
    if (chessQuery) {
      try {
        const analysis = await analyzeChessQuery(query);
        if (analysis && analysis.engineReachable && analysis.bestMove) {
          systemPrompt += `\n\n[Chess engine analysis for the current position — you can use this to answer the user's chess question.\nFEN: ${analysis.fen}\nBest move: ${analysis.bestMove} (${analysis.from} → ${analysis.to}${analysis.promotion ? ` promoting to ${analysis.promotion}` : ""})\nYou can mention this move or suggest alternatives — you are a strong chess player and these are your own calculations.]`;
        } else if (analysis && !analysis.engineReachable) {
          systemPrompt += `\n\n[The user is asking about chess but the engine is unavailable. Answer from your own chess knowledge without mentioning the engine.]`;
        }
      } catch {
        // Chess analysis is non-fatal — continue without it
      }
    }
  }

  const messages: OllamaMessage[] = [{ role: "system", content: systemPrompt }];

  // Prior turns (trimmed to recent history).
  for (const m of threadHistory.slice(-10)) {
    if (m.role === "user" || m.role === "assistant") {
      messages.push({ role: m.role, content: m.content });
    }
  }

  // Inject retrieved sources for grounded modes.
  const sourceContext =
    focusMode !== "nosearch" && sources.length
      ? buildSourceContext(sources)
      : "";

  // Image search — fetch images for all search queries to display in the UI (Perplexity-like),
  // but only inject them into the prompt for visual/shopping queries.
  let imageContext = "";
  let fetchedSearchImages: any[] = [];
  if (focusMode !== "nosearch" && !plain && !githubInvoke && query.trim().length > 3) {
    try {
      const imgResults = await searchImages(query, 6);
      if (imgResults.length) {
        fetchedSearchImages = imgResults;
        const isVisualQuery = /\b(buy|price|cost|\$|shop|product|show\s+me|what\s+does\s+.+\s+look\s+like|best\s+|cheap|affordable|review|worth|recommend|brand|model|gadget|phone|laptop|headphone|shoe|watch|camera|tv|monitor|keyboard|mouse|bag|jacket|dress|sneaker|picture|photo|image|diagram|chart|map)\b/i.test(query);
        if (isVisualQuery) {
          imageContext = "\n\n<Images from image search — you can embed these in your reply using standard markdown image syntax>\n";
          for (const img of imgResults) {
            const label = img.title || img.description || "Image";
            imageContext += `- ![${label}](${encodeURI(img.imgSrc)}) — ${img.description || img.title || ""} [source](${img.url})\n`;
          }
          imageContext += "</Images>";
        }
      }
    } catch {
      // Image search is non-fatal
    }
  }

  const userContent = sourceContext
    ? `${sourceContext}${imageContext}\n\nQuestion: ${query}`
    : imageContext
      ? `${imageContext}\n\nQuestion: ${query}`
      : query;

  messages.push({
    role: "user",
    content: userContent,
    // Forward base64 images to vision-capable models (ignored by text models).
    ...(Array.isArray(images) && images.length ? { images } : {}),
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullAnswer = "";
      try {
        if (fetchedSearchImages.length > 0) {
          controller.enqueue(encoder.encode(sse({ type: "search_images", images: fetchedSearchImages })));
        }

        if (provider === "kodaai") {
          // Native reasoning only on a normal turn (not the plain/GitHub passes).
          const useThink = think && !plain && !githubInvoke;
          for await (const delta of chatStreamRich({ model, messages, stream: true, think: useThink })) {
            if (delta.thinking) {
              controller.enqueue(encoder.encode(sse({ type: "thinking", content: delta.thinking })));
            }
            if (delta.content) {
              fullAnswer += delta.content;
              controller.enqueue(encoder.encode(sse({ type: "token", content: delta.content })));
            }
          }
        } else {
          for await (const delta of streamRichFromProvider(provider, {
            provider,
            apiKey: providerApiKey || "",
            baseUrl: providerBaseUrl || "",
            model,
            messages,
            signal: req.signal,
          })) {
            if (delta.content) {
              fullAnswer += delta.content;
              controller.enqueue(encoder.encode(sse({ type: "token", content: delta.content })));
            }
          }
        }

        // ── Generate follow-up questions (second, non-streaming call) ──
        // Skip on the GitHub directive pass — its output is just a directive.
        let questions: string[] = [];
        if (!githubInvoke) try {
          const raw = await chat({
            model,
            messages: [
              {
                role: "user",
                content: buildFollowupPrompt(query, fullAnswer),
              },
            ],
          });
          questions = parseFollowups(raw);
        } catch {
          questions = [];
        }

        if (questions.length) {
          controller.enqueue(
            encoder.encode(sse({ type: "followups", questions }))
          );
        }

        controller.enqueue(encoder.encode(sse({ type: "done" })));
      } catch (e) {
        const message =
          e instanceof OllamaError
            ? e.message
            : "Unexpected error reaching the KodaAI model service.";
        controller.enqueue(encoder.encode(sse({ type: "error", message })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/** Best-effort parse of the model's follow-up output into 3-4 strings. */
function parseFollowups(raw: string): string[] {
  const trimmed = raw.trim();
  // Try to locate a JSON array anywhere in the output.
  const match = trimmed.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) {
        return arr
          .filter((x) => typeof x === "string")
          .map((x: string) => x.trim())
          .filter(Boolean)
          .slice(0, 4);
      }
    } catch {
      /* fall through to line parsing */
    }
  }
  // Fallback: split bullet/numbered lines.
  return trimmed
    .split("\n")
    .map((l) => l.replace(/^[\s\-*\d.)]+/, "").trim())
    .filter((l) => l.length > 4 && l.endsWith("?"))
    .slice(0, 4);
}
