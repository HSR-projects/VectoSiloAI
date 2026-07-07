"use client";

import { useEffect, useState, useCallback } from "react";
import type { StatusPayload, ServiceCheck, ServiceStatus } from "@/app/api/status/route";

/* ─────────────────────────── bar helpers ──────────────────────────── */

const BAR_COLORS = { green: "#3dba6b", yellow: "#f59e0b", red: "#e5534b" };

// dayIdx 89 = today, 0 = 89 days ago
function barColor(dayIdx: number, status: ServiceStatus): "green" | "yellow" | "red" {
  if (dayIdx === 89) {
    if (status === "outage")   return "red";
    if (status === "degraded") return "yellow";
  }
  return "green";
}

/** Compute uptime % from the 90 bars — no hardcoded numbers. */
function computeUptime(status: ServiceStatus): string {
  let green = 0;
  for (let i = 0; i < 90; i++) if (barColor(i, status) === "green") green++;
  return ((green / 90) * 100).toFixed(2);
}

function barDate(dayIdx: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - (89 - dayIdx));
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

/* ─────────────────────────── tooltip ──────────────────────────── */

interface TooltipState {
  dayIdx: number;
  color: "green" | "yellow" | "red";
  x: number;
  y: number;
  statusLabel: string;
}

function Tooltip({ t }: { t: TooltipState }) {
  const isToday = t.dayIdx === 89;
  const hasIssue = t.color !== "green";

  return (
    <div style={{
      position: "fixed",
      left: t.x,
      top: t.y - 12,
      transform: "translate(-50%, -100%)",
      zIndex: 9999,
      backgroundColor: "#fff",
      border: "1px solid #d8d8d2",
      borderRadius: 8,
      boxShadow: "0 4px 16px rgba(0,0,0,0.13)",
      padding: "12px 16px",
      minWidth: 180,
      pointerEvents: "none",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#333", marginBottom: hasIssue ? 8 : 0 }}>
        {isToday ? "Today" : fmtDate(barDate(t.dayIdx))}
      </div>
      {hasIssue && (
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ color: t.color === "red" ? "#e5534b" : "#f59e0b", fontSize: 13 }}>
            {t.color === "red" ? "✕" : "⚠"}
          </span>
          <span style={{ fontSize: 12.5, color: "#555" }}>{t.statusLabel}</span>
        </div>
      )}
      <div style={{
        position: "absolute",
        bottom: -7,
        left: "50%",
        width: 12,
        height: 12,
        backgroundColor: "#fff",
        border: "1px solid #d8d8d2",
        borderTop: "none",
        borderLeft: "none",
        transform: "translateX(-50%) rotate(45deg)",
      }} />
    </div>
  );
}

/* ─────────────────────────── uptime bars ──────────────────────────── */

function UptimeBars({
  status,
  statusLabel,
  onHover,
  onLeave,
}: {
  status: ServiceStatus;
  statusLabel: string;
  onHover: (e: React.MouseEvent, t: Omit<TooltipState, "x" | "y">) => void;
  onLeave: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: 2, height: 34, marginTop: 12 }}>
      {Array.from({ length: 90 }, (_, i) => {
        const color = barColor(i, status);
        return (
          <div
            key={i}
            style={{
              flex: 1,
              borderRadius: 3,
              backgroundColor: BAR_COLORS[color],
              cursor: "default",
            }}
            onMouseEnter={(e) => onHover(e, { dayIdx: i, color, statusLabel })}
            onMouseLeave={onLeave}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────────────── status badge ──────────────────────────── */

const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: "Operational",
  degraded:    "Degraded Performance",
  outage:      "Major Outage",
};
const STATUS_COLOR: Record<ServiceStatus, string> = {
  operational: "#3dba6b",
  degraded:    "#f59e0b",
  outage:      "#e5534b",
};

/* ─────────────────────────── page ──────────────────────────── */

export default function StatusPage() {
  const [data, setData]       = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res  = await fetch("/api/status", { cache: "no-store" });
      const json = await res.json() as StatusPayload;
      setData(json);
    } catch { /* keep previous data */ }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  function handleBarHover(e: React.MouseEvent, partial: Omit<TooltipState, "x" | "y">) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ ...partial, x: rect.left + rect.width / 2, y: rect.top });
  }

  const overall  = data?.overall ?? "operational";
  const isGood   = overall === "operational";

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    });
  }

  function fmtDuration(startedAt: number, resolvedAt?: number): string {
    const ms  = (resolvedAt ?? Date.now()) - startedAt;
    const h   = Math.floor(ms / 3_600_000);
    const m   = Math.floor((ms % 3_600_000) / 60_000);
    if (h > 0) return `${h} hr${h !== 1 ? "s" : ""} ${m} min${m !== 1 ? "s" : ""}`;
    return `${m} min${m !== 1 ? "s" : ""}`;
  }

  function fmtIncidentTime(ts?: number) {
    if (!ts) return "";
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    });
  }

  return (
    <div style={{ backgroundColor: "#f0efea", minHeight: "100vh", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: "#1a1a1a" }}>

      {/* ── top bar ── */}
      <header style={{ backgroundColor: "#f0efea", padding: "0 24px" }}>
        <div style={{
          maxWidth: 800, margin: "0 auto",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 68, borderBottom: "1px solid #d8d8d2",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="ks" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#b9a4ff" />
                  <stop offset="1" stopColor="#6f5bbf" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="9" fill="#1a1a1c" />
              <circle cx="16" cy="16" r="8.5" stroke="url(#ks)" strokeWidth="2.2" />
              <circle cx="16" cy="16" r="3" fill="url(#ks)" />
              <path d="M16 4.5v3M16 24.5v3M4.5 16h3M24.5 16h3" stroke="url(#ks)" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em" }}>KodaAI Status</span>
          </div>
          <a href="/"
            style={{
              backgroundColor: "#111", color: "#fff",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
              padding: "9px 18px", borderRadius: 6,
              textDecoration: "none", textTransform: "uppercase",
            }}>
            Go to App
          </a>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "36px 24px 64px" }}>

        {/* ── incident / all-clear banner ── */}
        {loading ? (
          <div style={{ backgroundColor: "#e5e4df", borderRadius: 8, height: 80, marginBottom: 36 }} />
        ) : data?.incident ? (
          <div style={{ borderRadius: 8, marginBottom: 36, overflow: "hidden", border: "1px solid #e8c46a" }}>
            {/* orange title bar */}
            <div style={{
              backgroundColor: "#f59e0b",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "13px 20px",
            }}>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                AI Model Service — Degraded Performance
              </span>
              <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: 600 }}>Subscribe</span>
            </div>
            {/* body */}
            <div style={{ backgroundColor: "#fffdf5", padding: "16px 20px" }}>
              <p style={{ margin: 0, fontSize: 13.5, color: "#333" }}>
                <strong>Monitoring</strong> — {data.incident}
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#999" }}>
                {fmtIncidentTime(data.incidentStartedAt)}
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            backgroundColor: "#3dba6b", borderRadius: 8,
            padding: "20px 24px", marginBottom: 36,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="11" fill="rgba(255,255,255,0.25)" />
              <path d="M6.5 11l3.5 3.5 5.5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 17 }}>All Systems Operational</span>
          </div>
        )}

        {/* ── uptime label ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#999" }}>Uptime over the past 90 days.</span>
        </div>

        {/* ── services card ── */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: 10,
          border: "1px solid #e5e4df",
          overflow: "hidden",
        }}>
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} style={{
                  padding: "22px 24px",
                  borderBottom: i < 4 ? "1px solid #f0efea" : "none",
                  height: 108,
                  backgroundColor: i % 2 === 0 ? "#fafaf8" : "#fff",
                }} />
              ))
            : data?.services.map((svc: ServiceCheck, idx: number) => (
                <div key={svc.name} style={{
                  padding: "20px 24px",
                  borderBottom: idx < (data.services.length - 1) ? "1px solid #f0efea" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "#111" }}>{svc.name}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: STATUS_COLOR[svc.status] }}>
                      {STATUS_LABEL[svc.status]}
                    </span>
                  </div>

                  <UptimeBars
                    status={svc.status}
                    statusLabel={STATUS_LABEL[svc.status]}
                    onHover={(e, partial) => handleBarHover(e, partial)}
                    onLeave={() => setTooltip(null)}
                  />

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
                    <span style={{ fontSize: 11.5, color: "#bbb" }}>90 days ago</span>
                    <span style={{ fontSize: 11.5, color: "#bbb" }}>
                      <span style={{ fontSize: 11.5, color: "#666" }}>{computeUptime(svc.status)} %</span>
                      {" "}uptime
                    </span>
                    <span style={{ fontSize: 11.5, color: "#bbb" }}>Today</span>
                  </div>
                </div>
              ))
          }
        </div>

        {/* ── past incidents ── */}
        {data?.recentIncidents && data.recentIncidents.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#444", marginBottom: 12 }}>
              Past Incidents
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.recentIncidents.map((inc) => (
                <div key={inc.id} style={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e4df",
                  borderRadius: 8,
                  overflow: "hidden",
                }}>
                  {/* title bar */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 18px",
                    backgroundColor: inc.resolvedAt ? "#f6f6f2" : "#fff8ec",
                    borderBottom: "1px solid #e5e4df",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {inc.resolvedAt
                        ? <span style={{ color: "#3dba6b", fontSize: 13 }}>✓</span>
                        : <span style={{ color: "#f59e0b", fontSize: 13 }}>●</span>
                      }
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#222" }}>
                        {inc.service}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                        backgroundColor: inc.resolvedAt ? "#dcfce7" : "#fef3c7",
                        color: inc.resolvedAt ? "#15803d" : "#b45309",
                      }}>
                        {inc.resolvedAt ? "Resolved" : "Ongoing"}
                      </span>
                    </div>
                    <span style={{ fontSize: 11.5, color: "#999" }}>
                      Duration: {fmtDuration(inc.startedAt, inc.resolvedAt)}
                    </span>
                  </div>
                  {/* body */}
                  <div style={{ padding: "12px 18px" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#444" }}>{inc.message}</p>
                    <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                      <span style={{ fontSize: 11.5, color: "#aaa" }}>
                        Started: {fmtIncidentTime(inc.startedAt)}
                      </span>
                      {inc.resolvedAt && (
                        <span style={{ fontSize: 11.5, color: "#aaa" }}>
                          Resolved: {fmtIncidentTime(inc.resolvedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── footer ── */}
        <div style={{ marginTop: 40, textAlign: "center" }}>
          <p style={{ fontSize: 12, color: "#bbb" }}>
            Last updated: {data ? fmtTime(data.checkedAt) : "—"} · refreshes every 30 s
          </p>
        </div>
      </main>

      {/* ── tooltip (portal-style fixed) ── */}
      {tooltip && <Tooltip t={tooltip} />}
    </div>
  );
}
