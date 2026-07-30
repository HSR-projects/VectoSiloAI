"use client";

import { useCallback, useRef, useState } from "react";
import { useIncogniStore } from "@/lib/store";
import { uid, modelLabel } from "@/lib/utils";
import { AUTO_MODEL, pickAutoModel } from "@/lib/autoModel";
import { buildAttachments, toDisplayAttachment } from "@/lib/attachments";
import { supportsAudio, supportsVision } from "@/lib/modelCapabilities";
import { generateImage, editImage } from "@/lib/nvidia";
import { stripComputerSyntax, stripWebsiteSyntax, parseScaffoldDirective, stripScaffoldSyntax } from "@/lib/computerParser";
import { isReactProject } from "@/lib/computerPreview";
import { stripSlidesSyntax } from "@/lib/slidesParser";
import { stripSheetSyntax } from "@/lib/sheetsParser";
import { stripDocSyntax } from "@/lib/docParser";
import { parseGithubDirective, stripGithubSyntax } from "@/lib/githubDirective";
import { parseMemoryDirectives, stripMemorySyntax } from "@/lib/memoryDirective";
import { PAGE_OPEN_RE, VISIT_URL_RE } from "@/lib/prompts";
import { makeBuildState, detectBuilds, finalizeBuilds } from "@/lib/artifactDirectives";
import type { ProjectFile } from "@/types";
import type {
  AgentStep,
  Attachment,
  ChatStreamEvent,
  FocusMode,
  GeneratedImage,
  Message,
  PlayerColor,
  RouteDecision,
  SearchResult,
  Source,
  StepStatus,
  SwarmAgentRun,
  SwarmAgentStatus,
  SwarmStreamEvent,
} from "@/types";

interface SendOptions {
  /** Override the store focus mode for this single turn. */
  focusMode?: FocusMode;
  /** Run the autonomous multi-step research agent (Pro/Max). */
  agent?: boolean;
  /** Max search steps the agent may run (from the user's plan caps). */
  agentSteps?: number;
  /** Run Agent Swarm — parallel specialists + synthesizer (Pro/Max). */
  swarm?: boolean;
  /** Total swarm agent count from plan caps (includes synthesizer). */
  swarmAgents?: number;
  /** If set, read this URL instead of searching the web. */
  targetUrl?: string;
  /** Files attached to this turn (images, text, audio). */
  attachments?: Attachment[];
  /** Whether the plan allows text-to-image generation (Pro/Max). */
  imageGen?: boolean;
  /** Whether the plan allows Incogni's Computer (build/preview apps) (Pro/Max). */
  computer?: boolean;
  /** Max slides per deck for this plan (Free 20, Pro/Max 70). */
  slidesMax?: number;
  /** Use Computer Swarm: parallel Architect/UI Dev/Stylist agents (Pro/Max). */
  computerSwarm?: boolean;
  /** Use Coding Swarm: sequential research → architect → develop → integrate (Pro/Max). */
  codingSwarm?: boolean;
  /** Map of agent role → model name for multi-model swarm. */
  agentModels?: Record<string, string>;
  /** Think mode — model reasons in a  consolidated block, shown collapsibly. */
  think?: boolean;
}

/**
 * Drives a full agentic turn for a thread:
 *   user msg → (optional) web search + scrape → streaming chat → follow-ups.
 */
export function useChat(threadId: string | null) {
  const [loading, setLoading] = useState(false);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const store = useIncogniStore;

  const send = useCallback(
    async (query: string, opts: SendOptions = {}) => {
      if (!threadId || loading) return;
      const s = store.getState();
      const focusMode = opts.focusMode ?? s.focusMode;

      const attachments = opts.attachments ?? [];
      const hasImage = attachments.some((a) => a.kind === "image");
      const hasAudio = attachments.some((a) => a.kind === "audio");

      // Resolve "Auto" to the best available model for this specific task.
      // The sentinel is never sent to the API — we swap it here, per message.
      // Attachments bias the pick toward a vision/audio-capable model.
      const usingAuto = s.selectedModel === AUTO_MODEL;
      const model = usingAuto
        ? pickAutoModel(query, focusMode, s.availableModels, "", {
            needsVision: hasImage,
            needsAudio: hasAudio,
          })
        : s.selectedModel;

      if (!model) {
        // No model selected/available — surface as an assistant error.
        s.appendMessage(threadId, makeMsg("assistant", "", { error: "No model selected. Pick an IncogniAI model in the header.", focusMode }));
        return;
      }

      const attachmentCaps = {
        vision: supportsVision(model),
        audio: supportsAudio(model),
      };

      // A light difficulty hint can still be honored up-front; the decision to
      // OPEN the board, though, is the model's (via an artifact directive).
      const chessHint = detectChessIntent(query);
      if (chessHint?.difficulty) s.setChessDifficulty(chessHint.difficulty);

      // GitHub app: when connected and the user explicitly invokes GitHub
      // (@github, or a clear repos/profile/Actions request), skip web search and
      // send a focused GitHub-only turn so the model reliably emits the
      // [[github:…]] directive instead of guessing or searching the web.
      const githubInvoke =
        !opts.swarm &&
        (/@github\b/i.test(query) || (s.githubConnected && isGithubInvoke(query)));
      const modelQuery = githubInvoke ? query.replace(/@github\b/gi, "").trim() : query;

      const existingProject = latestProjectSnapshot(s.getThread(threadId));

      setLoading(true);
      setSearchWarning(null);

      // Snapshot prior history BEFORE appending the new user message so the
      // current query doesn't appear twice when the chat API appends it.
      const historySnapshot = (s.getThread(threadId)?.messages ?? [])
        .filter((m) => m.content)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      // Is there an active chess game? Inject board context so the AI can
      // suggest or execute a legal move.
      const chessFen = s.chessFen;
      const isChessOpen = s.artifact?.type === "chess" && !!chessFen;

      // 1. User message (store lightweight attachment metadata for display)
      s.appendMessage(
        threadId,
        makeMsg("user", query, attachments.length ? { attachments: attachments.map(toDisplayAttachment) } : {})
      );

      // 2. Assistant placeholder (streaming)
      const assistantId = uid();
      s.appendMessage(threadId, {
        id: assistantId,
        role: "assistant",
        content: "",
        streaming: true,
        sources: [],
        steps: [],
        focusMode,
        createdAt: Date.now(),
      });

      const update = (patch: Partial<Message>) =>
        store.getState().updateMessage(threadId, assistantId, patch);

      // Persist an auto-memory fact the model asked to remember (fire-and-forget).
      const saveMemory = (text: string) => {
        fetch("/api/account/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }).catch(() => {});
      };

      // ── Agent step tracking ─────────────────────────────────
      const steps: AgentStep[] = [];
      const pushStep = (
        label: string,
        status: StepStatus = "active",
        detail?: string
      ): string => {
        const id = uid();
        steps.push({ id, label, status, detail });
        update({ steps: [...steps] });
        return id;
      };
      const setStep = (id: string, status: StepStatus, detail?: string) => {
        const st = steps.find((x) => x.id === id);
        if (st) {
          st.status = status;
          if (detail !== undefined) st.detail = detail;
        }
        update({ steps: [...steps] });
      };

      // Surface the Auto-picked model so the choice is transparent to the user.
      if (usingAuto) {
        pushStep(`Auto-selected ${modelLabel(model)}`, "done", "best model for this task");
      }

      // Show an "Analyzing image" step whenever images are attached.
      let imageAnalysisStep: string | null = null;
      if (hasImage && attachmentCaps.vision) {
        const imgCount = attachments.filter((a) => a.kind === "image").length;
        imageAnalysisStep = pushStep(
          imgCount > 1 ? `Analyzing ${imgCount} images` : "Analyzing image",
          "active"
        );
      }

      // Recent history for routing context (before the new turn's messages).
      const priorThread = store.getState().getThread(threadId);
      const routerHistory = (priorThread?.messages ?? [])
        .filter((m) => m.id !== assistantId && m.content)
        .slice(-4)
        .map((m) => ({ role: m.role, content: m.content }));

      // ── 3. Agent Swarm path (parallel specialists) ───────────
      if (opts.swarm && opts.swarmAgents && opts.swarmAgents > 1) {
        const controller = new AbortController();
        abortRef.current = controller;
        const swarmBuilt = buildAttachments(query, attachments, attachmentCaps);
        try {
          const res = await fetch("/api/swarm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: swarmBuilt.query,
              model,
              agentModels: opts.agentModels || undefined,
              targetUrl: opts.targetUrl || undefined,
              images: swarmBuilt.images.length ? swarmBuilt.images : undefined,
              computerSwarm: opts.computerSwarm ?? (opts.computer && !opts.codingSwarm ? detectBuildIntent(query) : false),
              codingSwarm: opts.codingSwarm ?? (opts.computer ? false : undefined),
            }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            const text = await res.text().catch(() => "");
            update({ streaming: false, error: text || "Swarm request failed." });
            return;
          }

          let synthAcc = "";
          // The synthesizer can build artifacts too (Computer/Website/Slides/Sheet).
          const swarmBuild = makeBuildState(opts, existingProject);
          await readSwarmSse(res.body, (evt) => {
            if (evt.type === "init") {
              update({ swarmAgents: evt.agents });
            } else if (evt.type === "agent_update") {
              const current = store.getState().getThread(threadId)
                ?.messages.find((m) => m.id === assistantId)?.swarmAgents ?? [];
              update({
                swarmAgents: current.map((a) =>
                  a.id === evt.agentId
                    ? { ...a, status: evt.status, output: evt.output ?? a.output, sourceCount: evt.sourceCount ?? a.sourceCount }
                    : a
                ),
              });
            } else if (evt.type === "specialist_token") {
              const cur = store.getState().getThread(threadId)
                ?.messages.find((m) => m.id === assistantId)?.swarmAgents ?? [];
              update({
                swarmAgents: cur.map((a) =>
                  a.id === evt.agentId
                    ? { ...a, output: (a.output ?? "") + evt.content }
                    : a
                ),
              });
            } else if (evt.type === "synthesis_token") {
              synthAcc += evt.content;
              detectBuilds(synthAcc, swarmBuild);
              update({ content: stripDirectives(synthAcc) });
            } else if (evt.type === "error") {
              update({ streaming: false, error: evt.message });
            }
          });

          // Persist any artifacts the synthesizer built + run the sandbox terminal.
          const swarmArtifacts = finalizeBuilds(synthAcc, swarmBuild, existingProject?.commands);
          if (Object.keys(swarmArtifacts.patch).length) update(swarmArtifacts.patch);
          if (swarmArtifacts.computer && swarmArtifacts.computer.files.length > 0) {
            void runComputerTerminal(swarmArtifacts.computer.files, swarmArtifacts.computer.commands);
          } else if (swarmArtifacts.computer) {
            useIncogniStore.getState().setComputerStatus("ready");
          }

          update({ streaming: false });
          syncThread(threadId);
        } catch (e) {
          if ((e as Error).name !== "AbortError") {
            update({ streaming: false, error: "Swarm connection interrupted." });
          } else {
            update({ streaming: false });
          }
        } finally {
          abortRef.current = null;
          setLoading(false);
        }
        return;
      }

      // ── 3. Gather sources ─────────────────────────────────────
      //   Priority: targetUrl → agent multi-step → auto search/nosearch
      let sources: Source[] = [];
      let pageImages: string[] = []; // base64 images crawled from scraped pages
      const grounded = !githubInvoke && (focusMode === "all" || focusMode === "academic");

      // If the user typed a bare URL as their query (e.g. pasted a YouTube link
      // directly into the search bar), treat it like URL-focus mode so we scrape
      // it for context instead of running a web search that won't help.
      const implicitUrl = !opts.targetUrl ? extractBareUrl(query.trim()) : null;
      const effectiveTargetUrl = opts.targetUrl || implicitUrl || undefined;

      if (githubInvoke) {
        // GitHub invoke: no web search — go straight to the focused chat turn.
        pushStep("Connecting to GitHub", "done");
      } else if (effectiveTargetUrl) {
        // URL focus mode: scrape the given page, skip web search entirely.
        const isYT = /youtube\.com|youtu\.be/.test(effectiveTargetUrl);
        const label = isYT ? "Analyzing YouTube video" : `Reading ${urlDomain_(effectiveTargetUrl)}`;
        const readStep = pushStep(label, "active");
        const { sources: scraped, pageImages: urlImages } = await scrape([effectiveTargetUrl]);
        sources = scraped;
        pageImages = urlImages;
        update({ sources });
        setStep(readStep, scraped.length ? "done" : "skipped", scraped.length ? (isYT ? "transcript extracted" : "page loaded") : "could not read page");
      } else if (opts.agent && opts.agentSteps && opts.agentSteps > 0) {
        const planStep = pushStep("Planning research");
        const plan = await agentPlan(query, model, opts.agentSteps);
        setStep(planStep, "done", `${plan.length} searches planned`);

        const collected = new Map<string, Source>();
        for (const sub of plan) {
          const st = pushStep("Searching", "active", sub);
          try {
            const results = (await webSearch(sub)).slice(0, 4);
            if (results.length) {
              const missing = results.filter((r) => !r.content).map((r) => r.url);
              const empty = { sources: [] as Source[], pageImages: [] as string[] };
              const { sources: scraped } = missing.length ? await scrape(missing) : empty;
              for (const src of buildSources(results, scraped)) {
                if (!collected.has(src.url)) collected.set(src.url, src);
              }
              setStep(st, "done", `${results.length} results`);
            } else {
              setStep(st, "skipped", "no results");
            }
          } catch {
            setStep(st, "error", "search failed");
          }
          sources = [...collected.values()];
          update({ sources });
        }
        const synth = pushStep("Synthesizing answer", "active");
        setStep(synth, "done", `${sources.length} sources`);
      } else if (grounded) {
        const understand = pushStep("Understanding your request");

        let decision: RouteDecision = {
          needsSearch: true,
          searchQuery: query,
          reason: "academic mode",
        };
        if (focusMode === "all") {
          const decide = pushStep("Deciding if a search is needed");
          decision = await routeDecision(query, model, routerHistory);
          setStep(
            decide,
            "done",
            decision.needsSearch ? "Web search needed" : "Answer from knowledge"
          );
        }
        setStep(understand, "done");

        if (decision.needsSearch) {
          const searchStep = pushStep("Searching the web", "active", decision.searchQuery);
          try {
            const results = await webSearch(decision.searchQuery);
            const top = results.slice(0, 5);
            if (top.length) {
              setStep(searchStep, "done", `${top.length} results`);
              const readStep = pushStep("Reading sources", "active");
              const missing = top.filter((r) => !r.content).map((r) => r.url);
              const { sources: scraped, pageImages: srcImages } = missing.length
                ? await scrape(missing)
                : { sources: [], pageImages: [] };
              sources = buildSources(top, scraped);
              pageImages = srcImages;
              update({ sources });
              setStep(readStep, "done", `${sources.length} sources`);
            } else {
              setStep(searchStep, "skipped", "No results found");
            }
          } catch {
            setStep(searchStep, "error", "Search unavailable");
            setSearchWarning(
              "Web search is unavailable — answering from the model's knowledge only."
            );
          }
        } else {
          pushStep("Web search", "skipped", decision.reason);
        }
      }

      if (imageAnalysisStep) setStep(imageAnalysisStep, "done", "image understood");

      const writeStep = pushStep("Writing answer");

      // 4. Use the pre-captured history snapshot (no duplicate current query).
      const history = historySnapshot;

      // 5. Stream the answer
      const controller = new AbortController();
      abortRef.current = controller;

      // Augment query with board state when a chess game is active so the
      // model knows the current position before emitting a move directive.
      const baseQuery = isChessOpen
        ? `[Chess board FEN: ${chessFen}]\n${modelQuery}`
        : modelQuery;

      // Fold attachments in: inline text files, collect images for vision
      // models, and note anything the chosen model can't consume.
      const built = buildAttachments(baseQuery, attachments, attachmentCaps);
      // Prepend the current sandbox project so edit requests modify it in place
      // (sent to the model only — not shown in the user's chat bubble).
      const effectiveQuery = existingProject
        ? `${projectContext(existingProject)}\n\n${built.query}`
        : built.query;

      const currentThread = s.getThread(threadId);
      const customAI = currentThread?.customAIId 
        ? s.customAIs.find(ai => ai.id === currentThread.customAIId)
        : null;

      let currentSources = sources;
      let currentHistory = history;
      let res: Response | null = null;
      let attempt = 0;
      let shouldRetry = true;

      while (shouldRetry && attempt < 2) {
        attempt++;
        shouldRetry = false;
        try {
          res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: effectiveQuery,
              threadHistory: currentHistory,
              model,
              focusMode: githubInvoke ? "nosearch" : focusMode,
              githubInvoke,
              sources: currentSources,
              images: (() => {
                // Merge user-uploaded images with images crawled from pages.
                const all = [...(built.images || []), ...(pageImages || [])].slice(0, 8);
                return all.length ? all : undefined;
              })(),
              provider: store.getState().provider,
              providerApiKey: store.getState().providerApiKey,
              providerBaseUrl: store.getState().providerBaseUrl,
              customInstructions: customAI?.instructions,
            }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            // Free-tier usage limit (429) returns a JSON message; nudge to upgrade.
            if (res.status === 429) {
              const data = await res.json().catch(() => null);
              update({
                streaming: false,
                error: data?.error || "You've reached your free usage limit. Upgrade to continue.",
              });
              if (typeof window !== "undefined") window.location.href = "/pricing";
              return;
            }
            const text = await res.text().catch(() => "");
            
            const isContextError = text.toLowerCase().includes("prompt too long") || text.toLowerCase().includes("exceeded max context length") || text.toLowerCase().includes("context length");
            if (isContextError && attempt < 2) {
              shouldRetry = true;
              const compactionDelaySeconds = 3; // x = variable for delay
              const compactStep = pushStep("compacting.....", "active");
              
              currentSources = currentSources.map(s => ({
                ...s,
                content: s.content ? s.content.substring(0, 400) + "..." : s.content
              }));
              
              if (currentHistory.length > 2) {
                currentHistory = currentHistory.slice(-2);
                
                // Replace long chat with a compacted system message in the UI
                store.getState().setThreadMessages(id, [
                  { 
                    id: crypto.randomUUID(), 
                    role: "system", 
                    content: "🧠 Chat history compacted to free up memory.", 
                    createdAt: Date.now() 
                  },
                  ...currentHistory
                ]);
              }
              
              await new Promise(r => setTimeout(r, compactionDelaySeconds * 1000));
              setStep(compactStep, "done", "Context compacted");
              continue;
            }
            
            update({ streaming: false, error: text || "Chat request failed." });
            return;
          }
        } catch (e: any) {
          if (e.name === "AbortError") return;
          update({ streaming: false, error: "Network error during chat request." });
          return;
        }
      }

      if (!res || !res.body) return;

      try {

        // If the user attached an image this turn, use it as the basis for
        // image-to-image; otherwise it's plain text-to-image.
        const srcAtt = attachments.find((a) => a.kind === "image" && a.data);
        const sourceImageUrl = srcAtt
          ? `data:${srcAtt.mime || "image/png"};base64,${srcAtt.data}`
          : null;

        // Kick off image generation for an emitted [[image: …]] prompt.
        // If a savePath is given and Incogni's Computer is open, the image is
        // injected as a file in the project.
        const startImage = (prompt: string, savePath?: string) => {
          const imgId = uid();
          const cur =
            store.getState().getThread(threadId)?.messages.find((m) => m.id === assistantId)
              ?.generatedImages ?? [];
          update({ generatedImages: [...cur, { id: imgId, prompt, status: "loading" }] });

          const patch = (fn: (g: GeneratedImage) => GeneratedImage) => {
            const arr =
              store.getState().getThread(threadId)?.messages.find((m) => m.id === assistantId)
                ?.generatedImages ?? [];
            store.getState().updateMessage(threadId, assistantId, {
              generatedImages: arr.map((g) => (g.id === imgId ? fn(g) : g)),
            });
          };

          // Image-to-image when a source image is present; fall back to plain
          // text-to-image if native img2img isn't available.
          const run = sourceImageUrl
            ? editImage(prompt, sourceImageUrl).catch(() => generateImage(prompt))
            : generateImage(prompt);

          run
            .then((url) => {
              patch((g) => ({ ...g, url, status: "done" }));
              syncThread(threadId);
              // If Incogni's Computer is active and a save path was given,
              // inject the image into the project files.
              if (savePath) {
                injectImageIntoComputer(savePath, url);
              }
            })
            .catch((e) => {
              patch((g) => ({ ...g, status: "error", error: (e as Error).message }));
              syncThread(threadId);
            });
        };

        let acc = "";
        let artifactOpened = false;
        let chessColor: PlayerColor | null = null;
        let chessMoveDispatched = false;
        let scaffoldDispatched = false;
        let dispatchedImages = 0;
        let savedMemories = 0;
        // Native reasoning (Think mode): accumulate the model's thinking tokens
        // and time them so we can show "Thought for Ns".
        let thinkingAcc = "";
        let thinkStart = 0;
        let thinkDoneAt = 0;
        // Builder artifacts (Computer/Website/Slides/Spreadsheet) — shared logic.
        const buildState = makeBuildState(opts, existingProject);
        await readSse(res.body, (evt) => {
          if (evt.type === "thinking") {
            if (!thinkStart) thinkStart = Date.now();
            thinkingAcc += evt.content;
            update({ thinking: thinkingAcc });
          } else if (evt.type === "token") {
            if (thinkingAcc && !thinkDoneAt) thinkDoneAt = Date.now();
            acc += evt.content;

            // Detect & stream Computer/Website/Slides/Spreadsheet artifacts.
            detectBuilds(acc, buildState);

            // Open chess board directive
            const dir = parseArtifactDirective(acc);
            if (dir && !artifactOpened) {
              artifactOpened = true;
              chessColor = dir.playerColor;
              store.getState().openArtifact({
                type: "chess",
                title: "Chess",
                playerColor: dir.playerColor,
              });
            }

            // Chess move directive — chatbot plays a move on the board
            if (!chessMoveDispatched) {
              const mv = parseChessMoveDirective(acc);
              if (mv) {
                chessMoveDispatched = true;
                store.getState().setPendingChessMove(mv);
              }
            }

            // Template scaffold directive — AI references a template to auto-build in sandbox
            if (!scaffoldDispatched) {
              const sc = parseScaffoldDirective(acc);
              if (sc) {
                scaffoldDispatched = true;
                const title = sc.title || sc.id;
                store.getState().openComputer(title);
                store.getState().setComputerFiles([{
                  path: "README.md",
                  content: `# ${title}\n\nScaffolding from template \`${sc.id}\`...\n`
                }]);
                store.getState().setComputerCommands(["echo 'Scaffolding...'"]);
                // Fetch scaffold in background
                fetch(`/api/templates/scaffold?id=${encodeURIComponent(sc.id)}&title=${encodeURIComponent(title)}`)
                  .then(r => r.json())
                  .then(data => {
                    if (data.success && data.files) {
                      store.getState().setComputerFiles(data.files);
                      store.getState().setComputerCommands(data.commands);
                    }
                  })
                  .catch(() => {
                    store.getState().setComputerCommands([
                      "echo 'Scaffold failed — try manually'",
                      "npm create vite@latest . -- --template react-ts",
                    ]);
                  });
              }
            }

            // Image generation directives (Pro/Max only) — fire each new one as
            // it completes. Free-tier callers can't generate, so any stray
            // directive is just stripped from the visible text below.
            if (opts.imageGen) {
              const imgDirectives = parseImageDirectives(acc);
              for (let i = dispatchedImages; i < imgDirectives.length; i++) {
                startImage(imgDirectives[i].prompt, imgDirectives[i].path);
              }
              dispatchedImages = Math.max(dispatchedImages, imgDirectives.length);
            }

            // Page navigation: [[page: /path]] → open that platform page.
            const pageMatch = acc.match(/\[\[page:\s*(\/[^\]]*)\]\]/i);
            if (pageMatch) {
              const pageUrl = pageMatch[1].trim();
              if (pageUrl && typeof window !== "undefined") {
                window.location.href = pageUrl;
              }
            }

            // Webpage scraping: [[visit: <url>]] → scrape the page and append to chat
            const visitMatch = acc.match(/\[\[visit:\s*([^\]]+)\]\]/i);
            if (visitMatch) {
              const visitUrl = visitMatch[1].trim();
              if (visitUrl && !(window as any)._lastVisitedUrl?.includes(visitUrl)) {
                (window as any)._lastVisitedUrl = [...((window as any)._lastVisitedUrl || []), visitUrl];
                void (async () => {
                  const stepId = pushStep(`Reading ${visitUrl.replace(/^https?:\/\/(www\.)?/, "").slice(0, 20)}...`, "active");
                  try {
                    const { sources: scraped } = await scrape([visitUrl]);
                    if (scraped.length > 0 && scraped[0].content) {
                      setStep(stepId, "done", "page read successfully");
                      send(`Here is the content of the page you requested to visit (${visitUrl}):\n\n${scraped[0].content}`);
                    } else {
                      setStep(stepId, "error", "could not read page content");
                    }
                  } catch (err) {
                    setStep(stepId, "error", "failed to visit page");
                  }
                })();
              }
            }

            // Auto-memory: persist each new [[memory: …]] fact the model emits.
            const facts = parseMemoryDirectives(acc);
            for (let i = savedMemories; i < facts.length; i++) {
              saveMemory(facts[i]);
            }
            if (facts.length > savedMemories) {
              savedMemories = facts.length;
              update({ memorySaved: true });
            }

            update({ content: stripDirectives(acc) });
          } else if (evt.type === "search_images") {
            update({ searchImages: evt.images });
          } else if (evt.type === "followups") {
            update({ followups: evt.questions });
          } else if (evt.type === "error") {
            update({ streaming: false, error: evt.message });
          }
        });

        // Record how long the model spent reasoning, for the "Thought for Ns" label.
        if (thinkingAcc) {
          update({ thinkingMs: (thinkDoneAt || Date.now()) - (thinkStart || Date.now()) });
        }

        if (!artifactOpened && chessHint) {
          chessColor = chessHint.playerColor;
          store.getState().openArtifact({
            type: "chess",
            title: "Chess",
            playerColor: chessHint.playerColor,
          });
        }

        // GitHub action loop: if the model emitted a [[github:…]] directive,
        // run it against the user's account, then make a second "plain" pass so
        // the model turns the JSON result into a natural reply (streamed in).
        const gh = parseGithubDirective(acc);
        if (gh) {
          const ghStep = pushStep(`GitHub · ${gh.action.replace(/_/g, " ")}`, "active");
          update({ content: "" });
          let resultText = "";
          try {
            const r = await fetch("/api/apps/github/action", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: gh.action, args: gh.args }),
              signal: controller.signal,
            });
            const data = await r.json().catch(() => ({ ok: false, error: "Bad response." }));
            setStep(ghStep, data?.ok ? "done" : "error", gh.action.replace(/_/g, " "));
            resultText = JSON.stringify(data).slice(0, 14000);
          } catch {
            setStep(ghStep, "error", "request failed");
            resultText = JSON.stringify({ ok: false, error: "Could not reach GitHub." });
          }

          const summaryPrompt =
            `The user asked: "${query}"\n\n` +
            `I performed the GitHub action "${gh.action}" and got this JSON result:\n` +
            `${resultText}\n\n` +
            `Write a clear, friendly reply to the user based on this result. If it ` +
            `succeeded, summarise what happened (use a markdown table or list for ` +
            `repos/files/runs, and include links when present). If it failed, explain ` +
            `the error plainly and suggest how to fix it. Do not mention directives or raw JSON.`;

          let acc2 = "";
          try {
            const res2 = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: summaryPrompt,
                threadHistory: [],
                model,
                focusMode: "nosearch",
                plain: true,
                internal: true,
              }),
              signal: controller.signal,
            });
            if (res2.ok && res2.body) {
              await readSse(res2.body, (evt) => {
                if (evt.type === "token") {
                  acc2 += evt.content;
                  update({ content: acc2 });
                } else if (evt.type === "followups") {
                  update({ followups: evt.questions });
                }
              });
            }
          } catch {
            /* fall through to whatever we have */
          }
          // Persist the natural-language summary as the message content.
          acc = acc2 || "I ran the GitHub action, but couldn't format the result.";
          update({ content: acc });
        }

        setStep(writeStep, "done");
        update({ streaming: false });

        // Generate TTS audio for the response and attach as voice bubble.
        if (acc && acc.length < 4000) {
          generateTts(acc).then((voiceUrl) => {
            if (voiceUrl) update({ voiceUrl });
          }).catch(() => {});
        }

        // Leave a resume card on the message when a chess game was opened.
        if (chessColor) update({ chess: { playerColor: chessColor } });

        // Finalize builder artifacts (Computer/Website/Slides/Spreadsheet): persist
        // snapshots on the message and run the sandbox terminal if one was built.
        const artifacts = finalizeBuilds(acc, buildState, existingProject?.commands);
        if (Object.keys(artifacts.patch).length) update(artifacts.patch);
        if (artifacts.computer && artifacts.computer.files.length > 0) {
          void runComputerTerminal(artifacts.computer.files, artifacts.computer.commands, artifacts.computer.isEdit);
        } else if (artifacts.computer) {
          // No files — skip fake terminal, let sandbox handle it
          useIncogniStore.getState().setComputerStatus("ready");
        }

        // Generate a smart AI title after the very first response in a thread.
        const finishedThread = store.getState().getThread(threadId);
        if (finishedThread && finishedThread.messages.filter((m) => m.role === "assistant" && m.content).length === 1) {
          generateTitle(query, model).then((t) => {
            if (t) store.getState().updateThreadTitle(threadId, t);
          });
        }

        syncThread(threadId);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          update({
            streaming: false,
            error: "Connection to IncogniAI servers was interrupted.",
          });
        } else {
          update({ streaming: false });
        }
      } finally {
        abortRef.current = null;
        setLoading(false);
      }
    },
    [threadId, loading, store]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, stop, loading, searchWarning };
}

// ─── helpers ──────────────────────────────────────────────────

function makeMsg(
  role: Message["role"],
  content: string,
  extra: Partial<Message> = {}
): Message {
  return { id: uid(), role, content, createdAt: Date.now(), ...extra };
}

interface ChessIntent {
  playerColor: PlayerColor;
  difficulty?: number;
}

/**
 * Detect a genuine "let's play chess" request (not "explain chess history").
 * Also picks up the desired side and an easy/hard hint.
 */
function detectChessIntent(query: string): ChessIntent | null {
  const s = query.toLowerCase();
  if (!/\bchess\b/.test(s)) return null;

  const wantsPlay =
    /\b(play|let'?s|lets|start|begin|new game|match|rematch|challenge|wanna|up for|game of)\b/.test(
      s
    );
  if (!wantsPlay) return null;

  // Skip informational queries that merely mention chess.
  if (
    /\b(history|rules?|how (to|do|does)|explain|origin|who invented|notation|opening theory|strategy guide|meaning)\b/.test(
      s
    )
  )
    return null;

  const playerColor: PlayerColor = /\bblack\b/.test(s) ? "black" : "white";

  let difficulty: number | undefined;
  if (/\b(easy|easier|beginner|gentle|simple|go easy)\b/.test(s)) difficulty = 2;
  else if (/\b(hard|harder|difficult|expert|strong|master|tough|brutal)\b/.test(s))
    difficulty = 9;

  return { playerColor, difficulty };
}

const ARTIFACT_RE = /\[\[artifact:chess:(white|black)\]\]/i;
const CHESS_MOVE_RE = /\[\[chess:move:([a-h][1-8][a-h][1-8][qrbn]?)\]\]/i;
const IMAGE_RE = /\[\[image:\s*([^→]+?)(?:\s*→\s*([^\]]+?))?\]\]/i;

/** Extract every completed image directive's prompt and optional save path, in order. */
function parseImageDirectives(text: string): { prompt: string; path?: string }[] {
  const re = new RegExp(IMAGE_RE.source, "gi");
  const out: { prompt: string; path?: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const p = m[1].trim();
    if (p) out.push({ prompt: p, path: m[2]?.trim() || undefined });
  }
  return out;
}

/** Detect a completed chess artifact directive in the accumulated stream. */
function parseArtifactDirective(
  text: string
): { playerColor: PlayerColor } | null {
  const m = text.match(ARTIFACT_RE);
  return m ? { playerColor: m[1].toLowerCase() as PlayerColor } : null;
}

/** Detect a chess move directive (UCI notation). */
function parseChessMoveDirective(text: string): string | null {
  const m = text.match(CHESS_MOVE_RE);
  return m ? m[1].toLowerCase() : null;
}

/** Remove all directives (and any partial still-streaming ones) from visible text. */
function stripDirectives(text: string): string {
  return stripMemorySyntax(
    stripGithubSyntax(
    stripDocSyntax(
    stripWebsiteSyntax(
      stripSheetSyntax(
        stripSlidesSyntax(
          stripScaffoldSyntax(
            stripComputerSyntax(
              text
                .replace(new RegExp(ARTIFACT_RE.source, "gi"), "")
                .replace(new RegExp(CHESS_MOVE_RE.source, "gi"), "")
                .replace(new RegExp(IMAGE_RE.source, "gi"), "")
                .replace(PAGE_OPEN_RE, "")
                .replace(VISIT_URL_RE, "")
            )
          )
        )
      )
    )
  )))
}

/** Generate a concise AI title for the thread after the first response. */
async function generateTitle(query: string, model: string): Promise<string> {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `Give a SHORT title (3-5 words, no punctuation) for a conversation that starts with: "${query.slice(0, 200)}"`,
        threadHistory: [],
        model,
        focusMode: "nosearch",
        sources: [],
        internal: true,
      }),
    });
    if (!res.ok || !res.body) return "";
    let title = "";
    await readSse(res.body, (evt) => {
      if (evt.type === "token") title += evt.content;
    });
    return title.trim().replace(/^["']|["']$/g, "").slice(0, 60) || "";
  } catch {
    return "";
  }
}

/**
 * Ask the backend router whether this query needs a live web search.
 * Fails open (defaults to searching) so a router hiccup never drops grounding.
 */
async function routeDecision(
  query: string,
  model: string,
  history: { role: string; content: string }[]
): Promise<RouteDecision> {
  try {
    const res = await fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, model, history }),
    });
    if (!res.ok) throw new Error("route failed");
    return (await res.json()) as RouteDecision;
  } catch {
    return { needsSearch: true, searchQuery: query, reason: "router unavailable" };
  }
}

/** Ask the agent planner for a list of focused search sub-queries. */
async function agentPlan(
  goal: string,
  model: string,
  maxSteps: number
): Promise<string[]> {
  try {
    const res = await fetch("/api/agent/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, model, maxSteps }),
    });
    if (!res.ok) throw new Error("plan failed");
    const data = await res.json();
    const steps = Array.isArray(data?.steps) ? (data.steps as string[]) : [];
    return steps.length ? steps.slice(0, maxSteps) : [goal];
  } catch {
    return [goal];
  }
}

async function webSearch(query: string): Promise<SearchResult[]> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("search failed");
  const data = await res.json();
  if (data.unavailable) throw new Error("unavailable");
  return data.results ?? [];
}

async function scrape(urls: string[]): Promise<{ sources: Source[]; pageImages: string[] }> {
  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  });
  if (!res.ok) return { sources: [], pageImages: [] };
  const data = await res.json();
  return { sources: data.sources ?? [], pageImages: data.pageImages ?? [] };
}

/**
 * Build sources in search-result order, preferring content the search backend
 * already returned (Ollama web search), then any scraped fallback, then snippet.
 */
function buildSources(results: SearchResult[], scraped: Source[]): Source[] {
  const byUrl = new Map(scraped.map((s) => [s.url, s]));
  return results.map((r) => {
    const s = byUrl.get(r.url);
    return {
      url: r.url,
      title: r.title || s?.title || r.url,
      content: r.content || s?.content || r.snippet,
      snippet: r.snippet,
    };
  });
}

function syncThread(threadId: string) {
  const state = useIncogniStore.getState();
  const thread = state.getThread(threadId);
  if (!thread || (thread as any).isTemporary) return;
  fetch("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thread }),
  }).catch(() => {});
}

function urlDomain_(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url.slice(0, 30); }
}

/** Get the active or latest computer/website project files in this chat session. */
function latestProjectSnapshot(
  thread: { messages: Message[] } | undefined
): { title: string; files: ProjectFile[]; commands?: string[]; type: "computer" | "website" } | null {
  const store = useIncogniStore.getState();
  if (store.computer?.files?.length) {
    return { title: store.computer.title, files: store.computer.files, commands: store.computer.commands, type: "computer" };
  }
  if (store.website?.files?.length) {
    return { title: store.website.title, files: store.website.files, type: "website" };
  }
  if (thread) {
    for (let i = thread.messages.length - 1; i >= 0; i--) {
      const msg = thread.messages[i];
      if (msg.computer?.files?.length) {
        return { title: msg.computer.title, files: msg.computer.files, commands: msg.computer.commands, type: "computer" };
      }
      if (msg.website?.files?.length) {
        return { title: msg.website.title, files: msg.website.files, type: "website" };
      }
    }
  }
  return null;
}

/** Render the current project as context so the model performs incremental agent edits without rewriting everything. */
function projectContext(project: { title: string; files: ProjectFile[]; type: "computer" | "website" }): string {
  const files = project.files
    .map((f) => `<incogni-file path="${f.path}">\n${f.content}\n</incogni-file>`)
    .join("\n");
  const directive = project.type === "website" ? `[[website:${project.title}]]` : `[[computer:${project.title}]]`;
  return `[Incogni AI Agentic Project Context — current project "${project.title}" (${project.type}). You are an AGENTIC NATIVE AI assistant. The user is requesting an incremental edit or fix on this existing project. Do NOT rewrite unchanged files or start over. Apply only the requested change on top of these existing files, preserve all surrounding code and functionality, and re-emit the modified or new files using ${directive} and <incogni-file path="..."> tags.]\n${files}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Drive the sandbox terminal: replay the build/install/run commands with a bit
 * of realistic output so the user sees the project "execute", then flip to the
 * live preview. Purely cosmetic — the actual preview runs in the iframe.
 */
async function runComputerTerminal(files: ProjectFile[], commands: string[], isEdit = false) {
  const st = useIncogniStore.getState();
  if (!st.computer) return;
  const term = (line: string) => useIncogniStore.getState().appendComputerTerminal(line);
  const status = (s: Parameters<typeof st.setComputerStatus>[0]) =>
    useIncogniStore.getState().setComputerStatus(s);

  if (isEdit) {
    term(`\nincogni@sandbox:~/project$ applying edits (${files.length} file${files.length === 1 ? "" : "s"})…`);
    await sleep(200);
    const changed = files.length > (st.computer?.files.length ?? 0)
      ? files
      : files.slice(0, Math.min(5, files.length));
    for (const f of changed) {
      term(`  ✎ updated   ${f.path}`);
      await sleep(80);
    }
    term("✓ hot-reloading…");
    await sleep(300);
    status("ready");
    return;
  }

  const react = isReactProject(files);
  const cmds = commands.length
    ? commands
    : react
    ? ["npm install", "npm run dev"]
    : ["open index.html"];

  // Scaffold: show each file being written, one by one, so the build feels live.
  const dir = slug(st.computer.title);
  term(`incogni@sandbox:~/${dir}$ scaffolding project (${files.length} file${files.length === 1 ? "" : "s"})…`);
  await sleep(150);
  for (const f of files) {
    term(`  ✎ creating  ${f.path}`);
    await sleep(110);
    term(`  ✓ created   ${f.path}`);
    await sleep(40);
  }
  term(`✓ wrote ${files.length} file${files.length === 1 ? "" : "s"}`);
  await sleep(150);
  term(`incogni@sandbox:~/${dir}$ ls`);
  term(files.map((f) => f.path.split("/")[0]).filter((v, i, a) => a.indexOf(v) === i).join("  "));
  await sleep(250);

  for (const cmd of cmds) {
    term(`incogni@sandbox:~/${slug(st.computer.title)}$ ${cmd}`);
    await sleep(300);
    if (/install|^npm i\b|pnpm|yarn/.test(cmd)) {
      status("installing");
      term("⠙ resolving packages…");
      await sleep(450);
      const dep = react ? "react, react-dom, vite" : "dependencies";
      term(`added ${react ? 142 : 0 + files.length} packages (${dep})`);
      await sleep(200);
    } else if (/dev|start|serve|vite|preview/.test(cmd)) {
      status("running");
      await sleep(350);
      term("");
      term("  VITE v5.2.0  ready in 312 ms");
      term("");
      term("  ➜  Local:   http://localhost:5173/");
      term("  ➜  press h to show help");
      await sleep(300);
    } else {
      await sleep(200);
      term("done");
    }
  }
  status("ready");
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "project";
}

/**
 * True when a (GitHub-connected) user is explicitly invoking the GitHub app:
 * an `@github` mention, or a clear request about their repos/profile/Actions.
 * Used to bypass web search and send a focused GitHub-only turn.
 */
function isGithubInvoke(q0: string): boolean {
  const q = q0.toLowerCase();
  if (/@github\b/.test(q)) return true;
  const ghWord = /\bgithub\b/.test(q);
  const action =
    /\b(repos?|repositor(?:y|ies)|commit|commits|push|workflow|workflows|actions?|pull request|\bprs?\b|branch|branches|fork|gist|profile|readme)\b/.test(q);
  const personal = /\b(my|mine|i have|do i have|i've)\b/.test(q);
  if (ghWord && action) return true;
  if (action && personal && /\brepo|\bprofile|\bworkflow|\bgist/.test(q)) return true;
  return false;
}

/** True when the query is clearly asking to BUILD/CREATE a software project. */
function detectBuildIntent(query: string): boolean {
  const s = query.toLowerCase();
  const buildVerbs = /\b(build|create|make|code|develop|write|generate|scaffold)\b/;
  const appNouns = /\b(app|application|website|web app|dashboard|game|tool|component|ui|frontend|react|vite)\b/;
  return buildVerbs.test(s) && appNouns.test(s);
}

/**
 * If the entire query is a bare URL (possibly followed by whitespace), return
 * it so it can be treated as an implicit URL-focus request rather than a search.
 */
function extractBareUrl(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;
  // Only treat as a bare URL if the query IS the URL (no prose around it)
  if (/\s/.test(trimmed)) return null;
  try { new URL(trimmed); return trimmed; } catch { return null; }
}

/** Parse an SSE stream of SwarmStreamEvent JSON payloads. */
async function readSwarmSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: SwarmStreamEvent) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        try { onEvent(JSON.parse(payload) as SwarmStreamEvent); } catch { /* ignore */ }
      }
    }
  }
}

/** Parse an SSE stream of ChatStreamEvent JSON payloads. */
async function readSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (e: ChatStreamEvent) => void
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        try {
          onEvent(JSON.parse(payload) as ChatStreamEvent);
        } catch {
          /* ignore malformed event */
        }
      }
    }
  }
}

/**
 * Inject a generated image into the Incogni's Computer project files.
 * Converts the data URL to base64 content and adds it as a project file.
 */
function injectImageIntoComputer(savePath: string, dataUrl: string) {
  const store = useIncogniStore.getState();
  const comp = store.computer;
  if (!comp) return;

  // Convert data URL to just the base64 content wrapped as a data URI the
  // browser can serve directly from the file.
  const content = dataUrl.startsWith("data:")
    ? dataUrl  // already a data URL — keep as-is for the sandbox
    : dataUrl;

  const existing = comp.files.find((f) => f.path === savePath);
  if (existing) return; // already injected

  const newFiles = [...comp.files, { path: savePath, content }];
  store.setComputerFiles(newFiles);
}

/** Generate TTS audio for a text and return a blob URL, or null on failure. */
async function generateTts(text: string): Promise<string | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
