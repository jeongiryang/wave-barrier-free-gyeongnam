"use client";

import { useEffect, useRef, useState } from "react";
import { THEME_IDS } from "../../../lib/planner-criteria.js";
import { CLIENT_BUDGET_MS } from "../../../lib/request-budget.js";
import { plannerJson } from "../services/api";

type Availability = { candidates: Array<{ id: string; profiles: string[] }>; status: { partial: boolean } };
type Snapshot = { key: string; data?: Availability; error?: boolean };

function readAvailability(value: unknown, region: string, themes: string): Availability {
  const data = value as { region?: unknown; themes?: unknown; candidates?: Availability["candidates"]; status?: { partial?: unknown }; limit?: unknown } | null;
  if (!data || data.region !== region || JSON.stringify(data.themes) !== JSON.stringify(themes.split(","))
    || data.limit !== 12 || typeof data.status?.partial !== "boolean" || !Array.isArray(data.candidates) || data.candidates.length > 12
    || data.candidates.some(item => !item || typeof item.id !== "string" || !item.id || !Array.isArray(item.profiles) || item.profiles.some(profile => typeof profile !== "string"))
    || new Set(data.candidates.map(item => item.id)).size !== data.candidates.length) throw new Error("Invalid search count");
  return { candidates: data.candidates, status: { partial: data.status.partial } };
}

export function usePlaceAvailability(region: string, selectedThemes: string[], enabled: boolean) {
  const themes = (selectedThemes.length ? selectedThemes : THEME_IDS).join(",");
  const key = JSON.stringify([region, themes]);
  const [snapshot, setSnapshot] = useState<Snapshot>({ key: "" });
  const [revision, setRevision] = useState(0);
  const cache = useRef(new Map<string, { data: Availability; expires: number }>());
  useEffect(() => {
    if (!enabled || !region) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const cached = cache.current.get(key);
      if (cached && cached.expires > Date.now()) { setSnapshot({ key, data: cached.data }); return; }
      setSnapshot({ key });
      try {
        const params = new URLSearchParams({ action: "availability", region, themes, locale: "ko" });
        const raw = await plannerJson<unknown>(`/api/wave?${params}`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.plan });
        const data = readAvailability(raw, region, themes);
        if (controller.signal.aborted) return;
        if (!data.status.partial) {
          if (cache.current.size >= 24) cache.current.clear();
          cache.current.set(key, { data, expires: Date.now() + 300_000 });
        }
        setSnapshot({ key, data });
      } catch { if (!controller.signal.aborted) setSnapshot({ key, error: true }); }
    }, 450);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [enabled, region, themes, key, revision]);
  return {
    data: snapshot.key === key ? snapshot.data : undefined,
    error: snapshot.key === key && Boolean(snapshot.error),
    retry: () => { cache.current.delete(key); setSnapshot({ key }); setRevision(value => value + 1); },
  };
}
