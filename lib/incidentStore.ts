/**
 * Module-level incident store.
 * Persists across requests within the same Node.js process lifetime.
 *
 * Incidents have two states:
 *   active   — something is currently wrong
 *   resolved — the issue was fixed; kept in history for 24 h so the status
 *              page can show what happened and how long it lasted.
 */

export interface Incident {
  id: string;
  service: string;
  message: string;
  startedAt: number;
  resolvedAt?: number;
  ttlMs: number;
}

const HISTORY_TTL   = 24 * 60 * 60 * 1000; // keep resolved incidents for 24 h
const DEFAULT_TTL   =  4 * 60 * 60 * 1000; // active incidents auto-expire after 4 h
const MAX_HISTORY   = 20;

let activeId: string | null = null;
const store = new Map<string, Incident>();

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function pruneExpired() {
  const now = Date.now();
  for (const [id, inc] of store) {
    const age = now - (inc.resolvedAt ?? inc.startedAt);
    if (age > HISTORY_TTL) store.delete(id);
  }
}

/** Record a new active incident (idempotent — re-calling updates the message but keeps startedAt). */
export function recordIncident(service: string, message: string, ttlMs = DEFAULT_TTL) {
  if (activeId && store.has(activeId)) {
    // Update message on the existing active incident without resetting its start time.
    const existing = store.get(activeId)!;
    store.set(activeId, { ...existing, message, ttlMs });
    return;
  }
  const id = uid();
  store.set(id, { id, service, message, startedAt: Date.now(), ttlMs });
  activeId = id;

  // Cap history size
  if (store.size > MAX_HISTORY) {
    const oldest = [...store.keys()][0];
    store.delete(oldest);
  }
}

/** Mark the active incident as resolved. Keeps it in history. */
export function resolveIncident() {
  if (!activeId) return;
  const inc = store.get(activeId);
  if (inc && !inc.resolvedAt) {
    store.set(activeId, { ...inc, resolvedAt: Date.now() });
  }
  activeId = null;
}

/** Remove the active incident without leaving a history entry (use sparingly). */
export function clearIncident() {
  if (activeId) store.delete(activeId);
  activeId = null;
}

/** The currently active (unresolved) incident, or null. Auto-expires after ttlMs. */
export function getIncident(): Incident | null {
  pruneExpired();
  if (!activeId) return null;
  const inc = store.get(activeId);
  if (!inc) { activeId = null; return null; }
  if (Date.now() - inc.startedAt > inc.ttlMs) {
    // TTL expired without explicit resolution — resolve it automatically.
    store.set(activeId, { ...inc, resolvedAt: Date.now() });
    activeId = null;
    return null;
  }
  return inc;
}

/** All incidents from the past 24 h (active + resolved), newest first. */
export function getRecentIncidents(): Incident[] {
  pruneExpired();
  return [...store.values()]
    .sort((a, b) => b.startedAt - a.startedAt);
}
