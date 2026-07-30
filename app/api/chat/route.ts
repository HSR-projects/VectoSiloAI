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
  QUESTION_INSTRUCTIONS,
  MAP_INSTRUCTIONS,
  STOCK_INSTRUCTIONS,
  getCurrentDatePrompt,
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
import { searchImages, searchMaps } from "@/lib/searxng";
import type {
  ChatRequestBody,
  ChatStreamEvent,
  MapPlace,
  OllamaMessage,
} from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sse(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Quick magic-byte check that a base64 string decodes to a known image format. */
const IMAGE_MAGIC: ((b: Uint8Array) => boolean)[] = [
  (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  (b) => b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  (b) => b[0] === 0x42 && b[1] === 0x4d,
  (b) => b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00,
  (b) => b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a,
];

function isValidImageB64(s: string): boolean {
  if (!s) return false;
  try {
    const buf = Buffer.from(s, "base64");
    const view = new Uint8Array(buf);
    if (view.length < 4) return false;
    return IMAGE_MAGIC.some((check) => check(view));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    return await handlePost(req);
  } catch (e) {
    const msg = e instanceof OllamaError ? e.message : "Unexpected error reaching the IncogniAI model service.";
    console.error("[chat] Unhandled error:", e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handlePost(req: Request): Promise<Response> {
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

  // ── Sanitise image payloads ──────────────────────────────────
  // Some images scraped from the web may have a valid Content-Type header but
  // non-image magic bytes, causing Ollama to reject the whole request with
  // "invalid image: expected image mime type, got application/octet-stream".
  const validImages = Array.isArray(images) ? images.filter(isValidImageB64) : [];
  const hasImageAttachments = validImages.length > 0;

  // ── Free-tier usage limit (rolling window) ──────────────────
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

  const caps = effectiveCaps(userPlan);
  const model = hasImageAttachments
    ? "gemma4:31b"
    : caps.allModels
      ? (requestedModel === "auto" ? DEFAULT_MODEL : requestedModel)
      : DEFAULT_MODEL;

  const provider = rawProvider && rawProvider !== "incogni-ai" ? rawProvider : "incogni-ai";

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
    systemPrompt = `${getCurrentDatePrompt()}\n\n${memContextBlock}${SYSTEM_PROMPTS[focusMode] ?? SYSTEM_PROMPTS.all}\n\n${ARTIFACT_INSTRUCTIONS}\n\n${computerBlock}\n\n${WEBSITE_INSTRUCTIONS}\n\n${slidesBlock}\n\n${SHEETS_INSTRUCTIONS}\n\n${DOC_INSTRUCTIONS}\n\n${QUESTION_INSTRUCTIONS}\n\n${MAP_INSTRUCTIONS}${githubBlock}${memoryBlock}\n\n${PAGE_OPEN_INSTRUCTIONS}\n\n${SVG_INSTRUCTIONS}\n\n${imageBlock}\n\n${PRODUCT_SEARCH_INSTRUCTIONS}\n\n${TEMPLATE_INSTRUCTIONS}\n\n${BEHAVIORAL_INSTRUCTIONS}\n\n${ENGINE_SECRECY}\n\n${BRAND_IDENTITY}\n\n${PLATFORM_INFO}${customBlock}\n\n── QUICK REFERENCE (emit directives as the VERY FIRST characters, no preamble) ──\n• Build an app/game/tool → [[computer:Title]] + <incogni-file> + <incogni-cmd>\n• Static website/page → [[website:Title]] + <incogni-file>\n• Slides/presentation → [[slides:Title]] + <incogni-slide>\n• Spreadsheet/sheet → [[sheet:Title]] + <incogni-table>\n• Document/doc → [[doc:Title]] + <incogni-doc>\n• Ask MCQ clarifying question → [[question: {"prompt":"...", "options":["..."]}]]\n• Show interactive map / compare locations → [[map: Location or Place Name]]\n• Generate image → [[image: prompt → path]]\n• Run terminal command → [[computer:Terminal]] + <incogni-cmd>\n• Build from templates → [[scaffold:TEMPLATE_ID:Title]] (auto-builds complete website, no code needed)`;
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

  if (hasImageAttachments) {
    systemPrompt += `\n\n[Vision System Instruction: The user has attached image(s) to this turn. You are a vision-capable model. View, analyze, and describe the attached image(s) directly and accurately. Never refuse or say you cannot see the image.]`;
  }

  systemPrompt += `\n\n${STOCK_INSTRUCTIONS}`;

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

  // Image search & SearXNG Maps place search
  let imageContext = "";
  let mapContext = "";
  let fetchedSearchImages: any[] = [];
  let fetchedMapPlaces: MapPlace[] = [];

  if (focusMode !== "nosearch" && !plain && !githubInvoke && query.trim().length > 2) {
    const isMapOrLocationQuery = /\b(map|maps|location|place|places|city|cities|visit|travel|where\s+is|directions|distance|compare|hotel|restaurant|attraction|landmark|airport|park|weather|temperature)\b/i.test(query);
    const isVisualQuery = /\b(buy|price|cost|\$|shop|product|show\s+me|what\s+does\s+.+\s+look\s+like|best\s+|cheap|affordable|review|worth|recommend|brand|model|gadget|phone|laptop|headphone|shoe|watch|camera|tv|monitor|keyboard|mouse|bag|jacket|dress|sneaker|picture|photo|image|diagram|chart|map)\b/i.test(query);

    const tasks: Promise<void>[] = [];

    if (isMapOrLocationQuery) {
      tasks.push(
        searchMaps(query, 5)
          .then((mapResults) => {
            if (mapResults.length) {
              fetchedMapPlaces = mapResults;
              mapContext = "\n\n<SearXNG Maps & Location Context — places, coordinates, and OpenStreetMap data>\n";
              for (const place of mapResults) {
                mapContext += `- ${place.title}: Lat ${place.latitude}, Lon ${place.longitude} (${place.address || place.description || "Place"}) [Map Link](${place.url})\n`;
              }
              mapContext += "</SearXNG Maps>";
            }
          })
          .catch(() => { })
      );
    }

    if (isVisualQuery) {
      tasks.push(
        searchImages(query, 6)
          .then((imgResults) => {
            if (imgResults.length) {
              fetchedSearchImages = imgResults;
            }
          })
          .catch(() => { })
      );
    }

    if (tasks.length > 0) {
      await Promise.race([
        Promise.all(tasks),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }
  }

  const userContent = sourceContext
    ? `${sourceContext}${imageContext}${mapContext}\n\nQuestion: ${query}`
    : imageContext || mapContext
      ? `${imageContext}${mapContext}\n\nQuestion: ${query}`
      : query;

  messages.push({
    role: "user",
    content: userContent,
    // Forward base64 images to vision-capable models (ignored by text models).
    ...(hasImageAttachments ? { images: validImages } : {}),
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullAnswer = "";
      try {
        if (fetchedMapPlaces.length > 0) {
          controller.enqueue(encoder.encode(sse({ type: "map_places", places: fetchedMapPlaces })));
        }

        if (fetchedSearchImages.length > 0) {
          controller.enqueue(encoder.encode(sse({ type: "search_images", images: fetchedSearchImages })));
        }

        if (provider === "incogni-ai") {
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
            : "Unexpected error reaching the IncogniAI model service.";
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
