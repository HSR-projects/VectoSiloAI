import { NextResponse } from "next/server";
import { getIncident, getRecentIncidents, recordIncident, resolveIncident } from "@/lib/incidentStore";
import type { Incident } from "@/lib/incidentStore";
import { OLLAMA_BASE_URL, OLLAMA_API_KEY, DEFAULT_MODEL, FORCE_MODEL } from "@/lib/ollama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ServiceStatus = "operational" | "degraded" | "outage";

export interface ServiceCheck {
  name: string;
  status: ServiceStatus;
  incident?: string;
}

export interface StatusPayload {
  overall: ServiceStatus;
  incident?: string;
  incidentStartedAt?: number;
  services: ServiceCheck[];
  recentIncidents: Incident[];
  checkedAt: string;
}

/* ── Probe cache ───────────────────────────────────────────────────────────
   TTL is adaptive: short when failing (quick recovery detection) vs longer
   when healthy (reduce noise). Values can be overridden via env variables.   */

interface ProbeCache { ok: boolean; message?: string; at: number }
let probeCache: ProbeCache | null = null;

const PROBE_TTL_OK   = parseInt(process.env.STATUS_PROBE_TTL_OK_MS   ?? "90000",  10); // 90 s when healthy
const PROBE_TTL_FAIL = parseInt(process.env.STATUS_PROBE_TTL_FAIL_MS ?? "30000",  10); // 30 s when failing

const QUOTA_KEYWORDS = [
  "usage limit", "session usage", "upgrade for higher limits",
  "upgrade to", "rate limit", "quota", "exhausted",
];

function isQuotaError(text: string): boolean {
  return QUOTA_KEYWORDS.some((k) => text.toLowerCase().includes(k));
}

async function probeOllama(): Promise<{ ok: boolean; message?: string }> {
  const ttl = probeCache?.ok === false ? PROBE_TTL_FAIL : PROBE_TTL_OK;
  if (probeCache && Date.now() - probeCache.at < ttl) {
    return { ok: probeCache.ok, message: probeCache.message };
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (OLLAMA_API_KEY) headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
  const model = FORCE_MODEL || DEFAULT_MODEL;

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "hi" }],
        stream: false,
        options: { num_predict: 1 },
      }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    const result = { ok: false, message: "AI model service is unreachable." };
    probeCache = { ...result, at: Date.now() };
    return result;
  }

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    const msg = isQuotaError(text)
      ? "Our server is currently exhausted. Please wait about 3 hours to continue."
      : `AI model service returned an error (${res.status}).`;
    if (isQuotaError(text)) recordIncident("AI Model Service", msg, 3 * 60 * 60 * 1000);
    probeCache = { ok: false, message: msg, at: Date.now() };
    return { ok: false, message: msg };
  }

  // 200 OK — check for inline JSON error
  try {
    const json = JSON.parse(text);
    if (json?.error) {
      const msg = isQuotaError(String(json.error))
        ? "Our server is currently exhausted. Please wait about 3 hours to continue."
        : "AI model service returned an unexpected error.";
      if (isQuotaError(String(json.error))) recordIncident("AI Model Service", msg, 3 * 60 * 60 * 1000);
      probeCache = { ok: false, message: msg, at: Date.now() };
      return { ok: false, message: msg };
    }
  } catch { /* not JSON — probe succeeded */ }

  // Probe succeeded → mark incident resolved (keeps it in history)
  resolveIncident();
  probeCache = { ok: true, at: Date.now() };
  return { ok: true };
}

export async function GET(): Promise<NextResponse<StatusPayload>> {
  const probe = await probeOllama();

  // Live probe result is the sole authority.
  // A successful probe clears the incident store (done inside probeOllama).
  const aiDown = !probe.ok;

  const incident = aiDown ? getIncident() : null;
  const incidentMsg = probe.message ?? incident?.message;
  const incidentAt  = incident?.startedAt;

  const depStatus: ServiceStatus = aiDown ? "degraded" : "operational";

  const services: ServiceCheck[] = [
    { name: "VectoSiloAI Web App",   status: depStatus, incident: aiDown ? incidentMsg : undefined },
    { name: "AI Model Service", status: depStatus, incident: aiDown ? incidentMsg : undefined },
    { name: "Search",           status: depStatus, incident: aiDown ? incidentMsg : undefined },
    { name: "Authentication",   status: "operational" },
    { name: "API",              status: depStatus, incident: aiDown ? incidentMsg : undefined },
  ];

  const overall: ServiceStatus = aiDown ? "degraded" : "operational";

  return NextResponse.json({
    overall,
    incident:          aiDown ? incidentMsg  : undefined,
    incidentStartedAt: aiDown ? incidentAt   : undefined,
    services,
    recentIncidents:   getRecentIncidents(),
    checkedAt:         new Date().toISOString(),
  });
}
