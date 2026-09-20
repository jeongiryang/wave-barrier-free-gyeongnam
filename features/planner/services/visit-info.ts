import type { VisitInfo } from "../../../lib/visit-hours.js";
import { CLIENT_BUDGET_MS } from "../../../lib/request-budget.js";
import { plannerJson } from "./api";

const cache = new Map<string, { expires: number; info: VisitInfo }>();
const pending = new Map<string, Promise<VisitInfo>>();
const TTL = 15 * 60 * 1000;
const listeners = new Set<() => void>();
let version = 0;
export const visitInfoVersion = () => version;
export const serverVisitInfoVersion = () => 0;
export function subscribeVisitInfo(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
/** Read only previously requested evidence; this never starts a provider call. */
export function cachedVisitInfo(id: string): VisitInfo | null {
  const saved = cache.get(id);
  return saved && saved.expires > Date.now() ? saved.info : null;
}

export function fetchVisitInfo(id: string): Promise<VisitInfo> {
  if (!/^[1-9]\d{0,11}$/.test(id)) return Promise.reject(new Error("Invalid place"));
  const saved = cache.get(id);
  if (saved && saved.expires > Date.now()) return Promise.resolve(saved.info);
  const existing = pending.get(id);
  if (existing) return existing;
  const request = plannerJson<VisitInfo>(`/api/wave?action=visit-info&contentId=${encodeURIComponent(id)}`, { timeoutMs: CLIENT_BUDGET_MS.visitInfo }).then(info => {
    if (info.id !== id || !["available", "empty", "location-unconfirmed", "unsupported"].includes(info.status) || !Number.isFinite(Date.parse(info.checkedAt))) throw new Error("Invalid visit information");
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(id, { expires: Date.now() + TTL, info });
    version++;
    listeners.forEach(listener => listener());
    return info;
  }).finally(() => pending.delete(id));
  pending.set(id, request);
  return request;
}
