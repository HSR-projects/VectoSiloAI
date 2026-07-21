import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  type StdioServerParameters,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import path from "path";
import fs from "fs";
import type { SearchResult } from "@/types";

const SEARXNG_URL =
  process.env.SEARXNG_BASE_URL || "http://localhost:6767";
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "";

let client: Client | null = null;
let transport: StdioClientTransport | StreamableHTTPClientTransport | null = null;
let connectPromise: Promise<void> | null = null;
let connectAttempts = 0;

function resolveMcpBin(): string {
  const candidates = [
    path.join(process.cwd(), "node_modules", "searxng-mul-mcp", "build", "index.js"),
    path.join(process.cwd(), "..", "node_modules", "searxng-mul-mcp", "build", "index.js"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

async function destroyClient(): Promise<void> {
  try {
    if (transport) await transport.close();
  } catch {}
  client = null;
  transport = null;
  connectPromise = null;
}

async function getClient(): Promise<Client> {
  if (client) return client;
  if (connectPromise) {
    await connectPromise;
    if (client) return client;
  }

  connectPromise = (async () => {
    connectAttempts++;
    const c = new Client(
      { name: "vectosiloai-search", version: "1.0.0" },
      { capabilities: {} }
    );

    if (MCP_SERVER_URL) {
      // ── Production: connect to remote HTTP MCP server ──
      const t = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));
      transport = t;
      await c.connect(t);
    } else {
      // ── Dev: spawn MCP server as child process (stdio) ──
      const binPath = resolveMcpBin();
      const env: Record<string, string> = {
        SEARXNG_URL,
        ...Object.fromEntries(
          Object.entries(process.env).filter(
            ([k]) =>
              !k.startsWith("npm_") &&
              k !== "NODE_PATH" &&
              k !== "NEXT_RUNTIME" &&
              k !== "USER" &&
              k !== "USERNAME" &&
              k !== "PASSWORD"
          )
        ),
      };
      if (process.env.SEARXNG_USERNAME) env.USERNAME = process.env.SEARXNG_USERNAME;
      if (process.env.SEARXNG_PASSWORD) env.PASSWORD = process.env.SEARXNG_PASSWORD;

      const t = new StdioClientTransport({
        command: "node",
        args: [binPath],
        env,
        stderr: "pipe",
      });

      const stderrChunks: Buffer[] = [];
      if (t.stderr) {
        t.stderr.on("data", (chunk: Buffer) => {
          stderrChunks.push(chunk);
        });
      }

      t.onerror = (err) => {
        console.error("[search-mcp] transport error:", err.message);
      };
      t.onclose = () => {
        const stderrLog = Buffer.concat(stderrChunks).toString("utf-8").trim();
        if (stderrLog) {
          console.error("[search-mcp] MCP server stderr:", stderrLog);
        }
      };

      transport = t;
      await c.connect(t);
    }

    client = c;
  })();

  try {
    await connectPromise;
    return client!;
  } catch (e) {
    await destroyClient();
    throw e;
  }
}

function generateSubQueries(query: string): string[] {
  const queries = [query];
  const clean = query.replace(/[?]+$/, "").trim();

  if (clean.length > 10) {
    const terms = clean
      .split(/[\s,;]+/)
      .filter((t) => t.length > 3)
      .slice(0, 4);
    if (terms.length >= 3) {
      queries.push(terms.slice(0, 3).join(" "));
    }
  }

  if (
    /^(what|how|why|when|where|which|who)\b/i.test(clean) &&
    /\b(is|are|was|were|do|does|did|can|could|would|will|should)\b/i.test(
      clean
    )
  ) {
    const keywords = clean
      .replace(
        /^(what|how|why|when|where|which|who)\s+(is|are|was|were|do|does|did|can|could|would|will|should)\s+/i,
        ""
      )
      .trim();
    if (keywords && keywords.length < clean.length) {
      queries.push(keywords);
    }
  }

  return [...new Set(queries)].slice(0, 3);
}

export async function searchMCP(
  query: string,
  limit: number = 5
): Promise<SearchResult[]> {
  const c = await getClient();

  // Timeout for the MCP search call (10 seconds)
  const queries = generateSubQueries(query);

  let result: unknown;
  try {
    result = await Promise.race([
      c.callTool({
        name: "search",
        arguments: {
          queries,
          safesearch: 1,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("MCP search timed out after 10s")), 10_000)
      ),
    ]);
  } catch (e) {
    throw e;
  }

  const content = (result as { content?: { type: string; text?: string }[] }).content;
  const textContent = content?.find(
    (item) => item.type === "text"
  ) as { type: "text"; text: string } | undefined;

  if (!textContent?.text) return [];

  const parsed = JSON.parse(textContent.text);
  const allResults: SearchResult[] = [];
  const seen = new Set<string>();

  for (const search of parsed.searches || []) {
    if (!search.success) continue;
    for (const item of search.results || []) {
      const url = item.link || "";
      if (!url || seen.has(url)) continue;
      seen.add(url);
      allResults.push({
        title: item.title || "Untitled",
        url,
        snippet: item.snippet || "",
      });
    }
  }

  return allResults.slice(0, limit);
}

export async function closeMCP(): Promise<void> {
  if (transport) {
    await transport.close();
  }
  client = null;
  transport = null;
  connectPromise = null;
}
