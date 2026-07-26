import { getCurrentUser } from "@/lib/auth";
import { effectiveCaps } from "@/lib/plans";
import { chatStream, DEFAULT_MODEL } from "@/lib/ollama";
import { searchWeb } from "@/lib/searxng";
import {
  BEHAVIORAL_INSTRUCTIONS,
  buildSourceContext,
  COMPUTER_INSTRUCTIONS,
  WEBSITE_INSTRUCTIONS,
  SHEETS_INSTRUCTIONS,
  DOC_INSTRUCTIONS,
  slidesInstructions,
} from "@/lib/prompts";
import type { Source, SwarmAgentRun, SwarmAgentRole, AgentModelMap, SwarmStreamEvent } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CodingSpecialistDef {
  role: Exclude<SwarmAgentRole, "synthesizer">;
  label: string;
  systemPrompt: (query: string) => string;
  recommendedModel?: string;
}

const CODING_SPECIALISTS: CodingSpecialistDef[] = [
  {
    role: "researcher",
    label: "Researcher",
    recommendedModel: "gpt-oss:20b",
    systemPrompt: (q) =>
      `You are the Researcher in a IncogniAI Coding Swarm building: "${q}".\n` +
      "Your job: search the web for relevant documentation, examples, and best practices " +
      "for this project. Read the provided source materials carefully. " +
      "Identify the programming language, key libraries/algorithms, and build system needed. " +
      "Write a concise research brief (200-300 words) covering:\n" +
      "• Language(s) and key libraries/frameworks needed\n" +
      "• Core algorithms or data structures involved\n" +
      "• Architecture patterns to follow\n" +
      "• Any gotchas or important caveats\n" +
      "• Alternative approaches to consider\n" +
      "Output ONLY the research brief — no code, no file blocks.",
  },
  {
    role: "analyst",
    label: "Architect",
    recommendedModel: "nemotron3-ultra",
    systemPrompt: (q) =>
      `You are the Architect in a IncogniAI Coding Swarm building: "${q}".\n` +
      "Based on the researcher's findings, design the project structure.\n" +
      "Output ONLY <incogni-file> blocks for the project skeleton:\n" +
      "  • For C: Makefile or CMakeLists.txt, main.c, header files\n" +
      "  • For Python: requirements.txt, main.py, module files\n" +
      "  • For Node.js: package.json, entry point files\n" +
      "  • For other languages: the appropriate build config + entry point\n" +
      "Output ONLY the raw file blocks — no prose, no explanation, no fences.",
  },
  {
    role: "critic",
    label: "Developer",
    recommendedModel: "nemotron3-ultra",
    systemPrompt: (q) =>
      `You are the Developer in a IncogniAI Coding Swarm building: "${q}".\n` +
      "Your job: write the actual implementation files — all the logic, functions, and modules. " +
      "Output ONLY <incogni-file path=\"...\">...</incogni-file> blocks with complete, " +
      "working code. Make it production-quality: proper error handling, clean code, " +
      "good comments. Use standard library functions where possible; avoid unnecessary dependencies.\n" +
      "Output ONLY the raw file blocks — no prose, no fences.",
  },
];

const CODING_SYNTH_SYSTEM =
  "You are the Integrator in a IncogniAI Coding Swarm. " +
  "A Researcher, an Architect, and a Developer have each contributed to a coding project. " +
  "Your job: merge everything into one complete, working project.\n" +
  "Rules:\n" +
  "1. Emit `[[computer:Project Title]]` as the VERY FIRST characters.\n" +
  "2. Output every file from all three specialists using <incogni-file path=\"...\">...</incogni-file> tags. " +
  "If files overlap, use the most complete version.\n" +
  "3. After the files, emit the shell commands needed to build and run the project as " +
  "<incogni-cmd>command</incogni-cmd> tags, in order. You decide the commands based on the project " +
  "type and language — the sandbox supports gcc, g++, python3, node, npm, make, pip, and standard Unix tools.\n" +
  "4. End with 1-2 short sentences describing what was built.\n" +
  "Never show, mention, or explain the directive or incogni tags.";

const COMPUTER_SPECIALISTS: CodingSpecialistDef[] = [
  {
    role: "researcher",
    label: "Architect",
    systemPrompt: (q) =>
      `You are the Architect in a IncogniAI Computer Swarm building: "${q}"\n` +
      "Your job: write ONLY the project skeleton files.\n" +
      "Output EXACTLY these files using <incogni-file path=\"...\">...</incogni-file> tags:\n" +
      "  • package.json (with name, version, scripts, dependencies — react + react-dom + vite)\n" +
      "  • vite.config.js\n" +
      "  • index.html (Vite entry, loads /src/main.jsx)\n" +
      "  • src/main.jsx (ReactDOM.createRoot → <App />)\n" +
      "Output ONLY the raw file blocks — no prose, no explanation, no fences.",
  },
  {
    role: "analyst",
    label: "UI Developer",
    systemPrompt: (q) =>
      `You are the UI Developer in a IncogniAI Computer Swarm building: "${q}"\n` +
      "Your job: write ONLY the main React component(s).\n" +
      "Output ONLY <incogni-file path=\"src/App.jsx\">...</incogni-file> " +
      "(and any additional src/components/*.jsx files if needed).\n" +
      "The component should be complete, functional, and well-structured.\n" +
      "Import styles from './index.css'. Use React hooks as needed.\n" +
      "Output ONLY the raw file blocks — no prose, no markdown fences.",
  },
  {
    role: "critic",
    label: "Stylist",
    systemPrompt: (q) =>
      `You are the Stylist in a IncogniAI Computer Swarm building: "${q}"\n` +
      "Your job: write ONLY the CSS styling.\n" +
      "Output ONLY <incogni-file path=\"src/index.css\">...</incogni-file> " +
      "(and optionally src/App.css).\n" +
      "Make it beautiful: modern design, good typography, responsive layout, " +
      "attractive color palette, hover states, smooth transitions.\n" +
      "Output ONLY the raw file blocks — no prose, no markdown fences.",
  },
];

const COMPUTER_SYNTH_SYSTEM =
  "You are the Integrator in a IncogniAI Computer Swarm. " +
  "Three specialists — an Architect, a UI Developer, and a Stylist — have each written " +
  "their portion of a React/Vite project as <incogni-file> blocks. " +
  "Your job: merge ALL their files into one complete, working project.\n" +
  "Rules:\n" +
  "1. Emit `[[computer:Project Title]]` as the VERY FIRST characters.\n" +
  "2. Output every file from all three specialists using <incogni-file path=\"...\">...</incogni-file> tags. " +
  "If files overlap, use the most complete version (prefer UI Dev's App.jsx over Architect's).\n" +
  "3. After the files, emit: <incogni-cmd>npm install</incogni-cmd><incogni-cmd>npm run dev</incogni-cmd>\n" +
  "4. End with 1-2 short sentences describing what was built.\n" +
  "Never show, mention, or explain the directive or incogni tags.";

interface SpecialistDef {
  role: Exclude<SwarmAgentRole, "synthesizer">;
  label: string;
  searchQuery: (q: string) => string;
  systemPrompt: string;
}

const SPECIALISTS: SpecialistDef[] = [
  {
    role: "researcher",
    label: "Deep Researcher",
    searchQuery: (q) => q,
    systemPrompt:
      "You are the Deep Researcher in a IncogniAI Agent Swarm. " +
      "Your job is exhaustive fact-finding. Search multiple angles of the topic and surface concrete data: " +
      "numbers, dates, names, studies, statistics, direct quotes from primary sources. " +
      "Do NOT editorialize — stick to verifiable information. " +
      "Cite sources inline as [1], [2] etc. when provided. " +
      "Write a dense, information-rich report of 300-400 words. Every sentence should add a new fact.",
  },
  {
    role: "analyst",
    label: "Reasoner",
    searchQuery: (q) => `${q} mechanisms causes implications underlying factors`,
    systemPrompt:
      "You are the Reasoner in a IncogniAI Agent Swarm. " +
      "You think in first principles and logical chains. Do NOT just restate facts — explain the WHY behind them. " +
      "Break down root causes, trace cause-and-effect chains, identify hidden assumptions, and reason step by step to conclusions. " +
      "Use structured thinking: hypothesis → evidence → conclusion. Challenge surface-level narratives. " +
      "Write a rigorous analytical report of 300-400 words. Show your reasoning process, not just results.",
  },
  {
    role: "critic",
    label: "Media Scout",
    searchQuery: (q) => `${q} news coverage public opinion narrative media`,
    systemPrompt:
      "You are the Media Scout in a IncogniAI Agent Swarm. " +
      "Your job is to map how this topic is covered, framed, and debated in public discourse. " +
      "What is the dominant narrative? What are competing narratives? Who is pushing each angle? " +
      "What is underreported or sensationalized? What do different audiences believe? " +
      "Analyze the media and public-opinion landscape around this topic critically. " +
      "Cite sources inline as [1], [2] etc. when provided. " +
      "Write a sharp media-intelligence report of 300-400 words.",
  },
];

const SYNTH_SYSTEM =
  "You are the Synthesizer in a IncogniAI Agent Swarm. " +
  "Three specialist agents — a Deep Researcher, a Reasoner, and a Media Scout — have each written a report on the user's query. " +
  "Your job: weave their findings into one authoritative, well-structured answer in markdown. " +
  "Lead with the strongest insight. Layer in research facts, the logical reasoning behind them, and the media/public context. " +
  "Resolve contradictions explicitly. Cut redundancy ruthlessly. " +
  "When attribution adds real clarity, note it as (Researcher), (Reasoner), or (Media Scout) — " +
  "but only when it matters, not mechanically. " +
  "The result should feel like a single expert wrote it after consulting three specialists. " +
  "Use headers, bullet points, or tables when they genuinely help — don't force structure on simple answers.";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function agentUserMsg(query: string, sources: Source[]): string {
  const ctx = sources.length ? buildSourceContext(sources) + "\n\n" : "";
  return `${ctx}Query: ${query}`;
}

function synthUserMsg(query: string, reports: { label: string; output: string }[]): string {
  const sections = reports
    .map((r) => `--- ${r.label} Report ---\n${r.output}`)
    .join("\n\n");
  return `Specialist agent reports for: "${query}"\n\n${sections}\n\nSynthesize these into a complete, well-structured answer.`;
}

function resolveAgentModel(
  agentRole: string,
  agentModels: AgentModelMap | undefined,
  fallback: string
): string {
  return agentModels?.[agentRole as SwarmAgentRole] || fallback;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const caps = effectiveCaps(user?.plan ?? "free");
  const scrapeUrls = (urls: string[]) => import("@/lib/scraper").then(m => m.scrapeUrls(urls));

  if (!caps.swarm) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "Agent Swarm requires Pro or Max." })}\n\n`,
      { status: 402, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  let body: {
    query?: string;
    model?: string;
    agentModels?: AgentModelMap;
    targetUrl?: string;
    images?: string[];
    computerSwarm?: boolean;
    codingSwarm?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid body.", { status: 400 });
  }

  const { query, model = DEFAULT_MODEL, agentModels, targetUrl, images = [], computerSwarm = false, codingSwarm = false } = body;
  if (!query?.trim()) {
    return new Response("Missing query.", { status: 400 });
  }
  const imagePayload = Array.isArray(images) && images.length ? images : undefined;

  const specialistCount = Math.min(caps.swarmAgents - 1, SPECIALISTS.length);

  const agentList: SwarmAgentRun[] = codingSwarm
    ? [
        ...CODING_SPECIALISTS.map((s) => ({
          id: uid(),
          role: s.role as SwarmAgentRole,
          label: s.label,
          status: "pending" as const,
          model: resolveAgentModel(s.role, agentModels, s.recommendedModel || model),
        })),
        { id: uid(), role: "synthesizer" as const, label: "Integrator", status: "pending" as const, model: resolveAgentModel("synthesizer", agentModels, model) },
      ]
    : computerSwarm
    ? [
        ...COMPUTER_SPECIALISTS.map((s) => ({
          id: uid(),
          role: s.role as SwarmAgentRole,
          label: s.label,
          status: "pending" as const,
          model: resolveAgentModel(s.role, agentModels, model),
        })),
        { id: uid(), role: "synthesizer" as const, label: "Integrator", status: "pending" as const, model: resolveAgentModel("synthesizer", agentModels, model) },
      ]
    : [
        ...SPECIALISTS.slice(0, specialistCount).map((s) => ({
          id: uid(),
          role: s.role as SwarmAgentRole,
          label: s.label,
          status: "pending" as const,
          model: resolveAgentModel(s.role, agentModels, model),
        })),
        { id: uid(), role: "synthesizer" as const, label: "Synthesizer", status: "pending" as const, model: resolveAgentModel("synthesizer", agentModels, model) },
      ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (evt: SwarmStreamEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
        } catch { }
      };

      push({ type: "init", agents: agentList });

      const reports: { label: string; output: string }[] = [];

      if (codingSwarm) {
        // ── Coding Swarm: research → architect → develop → integrate ──
        for (let i = 0; i < CODING_SPECIALISTS.length; i++) {
          const spec = CODING_SPECIALISTS[i];
          const agent = agentList[i];
          push({ type: "agent_update", agentId: agent.id, status: "thinking" });
          try {
            let messages: { role: string; content: string; images?: string[] }[] = [
              { role: "system", content: spec.systemPrompt(query) },
            ];

            // Researcher searches the web; others get the research context
            if (i === 0) {
              const results = await searchWeb(query, 5).catch(() => []);
              const missingUrls = results.filter((r) => !r.content).map((r) => r.url);
              const scraped = missingUrls.length ? await scrapeUrls(missingUrls).catch(() => []) : [];
              const byUrl = new Map(scraped.map((s) => [s.url, s]));
              const sources = results.map((r) => ({
                url: r.url,
                title: r.title,
                content: r.content || byUrl.get(r.url)?.content || r.snippet || "",
                snippet: r.snippet,
              }));
              messages.push({ role: "user", content: agentUserMsg(query, sources) });
            } else {
              const prevReports = reports.map((r) => r.output).join("\n\n");
              messages.push({ role: "user", content: `Research findings:\n\n${prevReports}\n\nNow do your part for: ${query}` });
            }

            let output = "";
            for await (const token of chatStream({
              model: agent.model || model,
              messages: messages as any,
              options: { temperature: i === 0 ? 0.3 : 0.2 },
            })) {
              output += token;
              push({ type: "specialist_token", agentId: agent.id, content: token });
            }
            reports.push({ label: spec.label, output });
            const fileCount = (output.match(/<incogni-file/g) || []).length;
            push({ type: "agent_update", agentId: agent.id, status: "done", output, sourceCount: fileCount || 1 });
          } catch {
            push({ type: "agent_update", agentId: agent.id, status: "error" });
          }
        }

        // Integrator: merge all into [[computer:]] directive
        const synthAgent = agentList[agentList.length - 1];
        push({ type: "agent_update", agentId: synthAgent.id, status: "thinking" });
        const integratorMsg =
          `Project: "${query}"\n\n` +
          reports.map((r) => `=== ${r.label} ===\n${r.output}`).join("\n\n") +
          `\n\nMerge all the above into one complete [[computer:${query.slice(0, 40)}]] project. Output the directive + all files + commands.`;
        try {
          for await (const token of chatStream({
            model: synthAgent.model || model,
            messages: [
              { role: "system", content: CODING_SYNTH_SYSTEM },
              { role: "user", content: integratorMsg },
            ],
          })) {
            push({ type: "synthesis_token", content: token });
          }
          push({ type: "agent_update", agentId: synthAgent.id, status: "done" });
        } catch {
          push({ type: "agent_update", agentId: synthAgent.id, status: "error" });
        }
      } else if (computerSwarm) {
        await Promise.allSettled(
          COMPUTER_SPECIALISTS.map(async (spec, i) => {
            const agent = agentList[i];
            push({ type: "agent_update", agentId: agent.id, status: "thinking" });
            try {
              let output = "";
              for await (const token of chatStream({
                model: agent.model || model,
                messages: [
                  { role: "system", content: spec.systemPrompt(query) },
                  { role: "user", content: `Build this project: ${query}` },
                ],
                options: { temperature: 0.2 },
              })) {
                output += token;
                push({ type: "specialist_token", agentId: agent.id, content: token });
              }
              reports.push({ label: spec.label, output });
              const fileCount = (output.match(/<incogni-file/g) || []).length;
              push({ type: "agent_update", agentId: agent.id, status: "done", output, sourceCount: fileCount });
            } catch {
              push({ type: "agent_update", agentId: agent.id, status: "error" });
            }
          })
        );

        const synthAgent = agentList[agentList.length - 1];
        push({ type: "agent_update", agentId: synthAgent.id, status: "thinking" });
        const integratorMsg =
          `Project: "${query}"\n\n` +
          reports.map((r) => `=== ${r.label} ===\n${r.output}`).join("\n\n") +
          `\n\nMerge all the above <incogni-file> blocks into one complete [[computer:${query.slice(0, 40)}]] project. Output the directive + all files + commands.`;
        try {
          for await (const token of chatStream({
            model: synthAgent.model || model,
            messages: [
              { role: "system", content: COMPUTER_SYNTH_SYSTEM },
              { role: "user", content: integratorMsg },
            ],
          })) {
            push({ type: "synthesis_token", content: token });
          }
          push({ type: "agent_update", agentId: synthAgent.id, status: "done" });
        } catch {
          push({ type: "agent_update", agentId: synthAgent.id, status: "error" });
        }
      } else {
        const specialists = SPECIALISTS.slice(0, specialistCount);

        let sharedSources: Source[] = [];
        if (targetUrl) sharedSources = await scrapeUrls([targetUrl]).catch(() => []);

        await Promise.allSettled(
          specialists.map(async (spec, i) => {
            const agent = agentList[i];
            push({ type: "agent_update", agentId: agent.id, status: "thinking" });

            try {
              let sources: Source[] = sharedSources;
              let sourceCount = sources.length;

              if (!targetUrl) {
                const results = await searchWeb(spec.searchQuery(query), 3).catch(() => []);
                const missingUrls = results.filter((r) => !r.content).map((r) => r.url);
                const scraped = missingUrls.length ? await scrapeUrls(missingUrls).catch(() => []) : [];
                const byUrl = new Map(scraped.map((s) => [s.url, s]));
                sources = results.map((r) => ({
                  url: r.url,
                  title: r.title,
                  content: r.content || byUrl.get(r.url)?.content || r.snippet || "",
                  snippet: r.snippet,
                }));
                sourceCount = sources.length;
              }

              let output = "";
              for await (const token of chatStream({
                model: agent.model || model,
                messages: [
                  { role: "system", content: spec.systemPrompt },
                  {
                    role: "user",
                    content: agentUserMsg(query, sources),
                    ...(imagePayload ? { images: imagePayload } : {}),
                  } as any,
                ],
                options: { temperature: 0.3 },
              })) {
                output += token;
                push({ type: "specialist_token", agentId: agent.id, content: token });
              }

              reports.push({ label: spec.label, output });
              push({ type: "agent_update", agentId: agent.id, status: "done", output, sourceCount });
            } catch {
              push({ type: "agent_update", agentId: agent.id, status: "error" });
            }
          })
        );

        const synthAgent = agentList[agentList.length - 1];
        push({ type: "agent_update", agentId: synthAgent.id, status: "thinking" });
        const synthSystem = `${SYNTH_SYSTEM}\n\n${BEHAVIORAL_INSTRUCTIONS}\n\n${COMPUTER_INSTRUCTIONS}\n\n${WEBSITE_INSTRUCTIONS}\n\n${slidesInstructions(caps.slidesMax)}\n\n${SHEETS_INSTRUCTIONS}\n\n${DOC_INSTRUCTIONS}`;
        try {
          for await (const token of chatStream({
            model: synthAgent.model || model,
            messages: [
              { role: "system", content: synthSystem },
              { role: "user", content: synthUserMsg(query, reports) },
            ],
          })) {
            push({ type: "synthesis_token", content: token });
          }
          push({ type: "agent_update", agentId: synthAgent.id, status: "done" });
        } catch {
          push({ type: "agent_update", agentId: synthAgent.id, status: "error" });
        }
      }

      push({ type: "done" });
      controller.close();
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
