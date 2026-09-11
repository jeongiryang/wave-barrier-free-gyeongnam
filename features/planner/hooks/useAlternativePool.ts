"use client";
import { useEffect, useRef, useState } from "react";
import { CLIENT_BUDGET_MS } from "../../../lib/request-budget.js";
import { criteriaSignature } from "../../../lib/planner-criteria.js";
import { GYEONGNAM_REGION_POINTS } from "../../../lib/gyeongnam-regions.js";
import { mapDistanceMetres } from "../../../lib/map-coordinates.js";
import { plannerJson } from "../services/api";
import { planResponse } from "../services/plan-response";
import type { Place, PlanData } from "../types";

const SEEN_KEY = "wave-alternative-seen-v1";
function readSeen() {
  try { const value = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); return Array.isArray(value) ? value.filter(id => typeof id === "string" && /^[1-9]\d{0,11}$/.test(id)).slice(-200) : []; }
  catch { return []; }
}
export function nearbyAlternativeRegions(region: string) {
  const center = GYEONGNAM_REGION_POINTS[region as keyof typeof GYEONGNAM_REGION_POINTS] || GYEONGNAM_REGION_POINTS["경남 전체"];
  return Object.entries(GYEONGNAM_REGION_POINTS).filter(([name]) => name !== "경남 전체")
    .sort(([, a], [, b]) => mapDistanceMetres(center, a) - mapDistanceMetres(center, b)).map(([name]) => name);
}

export function useAlternativePool({ region, themes, profiles, places, current, requiredKeys, indoor }: {
  region: string; themes: string; profiles: string[]; places: Place[]; current: boolean; requiredKeys: string[]; indoor: boolean;
}) {
  const [selectedRegion, setSelectedRegion] = useState(region === "경남 전체" ? nearbyAlternativeRegions(region)[0] : region);
  const [extra, setExtra] = useState<{ data: PlanData; signature: string; region: string; themes: string } | null>(null);
  const [loading, setLoading] = useState(false), [notice, setNotice] = useState("");
  const [seen, setSeen] = useState<string[]>(readSeen);
  const pending = useRef<AbortController | null>(null);
  const signature = criteriaSignature({ region, themes, selected: profiles, locale: "ko" });
  const relevantExtra = extra?.signature === signature && extra.themes === (indoor ? "history" : themes) ? extra : null;
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => { pending.current?.abort(); }, [signature]);

  async function search(indoor = false) {
    if (pending.current || !profiles.length || !themes || !nearbyAlternativeRegions(region).includes(selectedRegion)) return;
    const controller = new AbortController(); pending.current = controller; setLoading(true); setNotice("");
    const requestedThemes = indoor ? "history" : themes;
    try {
      const params = new URLSearchParams({ action: "plan", region: selectedRegion, themes: requestedThemes, profiles: profiles.join(","), locale: "ko" });
      const response = await plannerJson<unknown>(`/api/wave?${params}`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.plan });
      const data = planResponse(response);
      if (!data.criteria?.facilityKeys?.length) throw Error("Missing facility criteria");
      if (!controller.signal.aborted) {
        setExtra({ data, signature, region: selectedRegion, themes: requestedThemes });
        setNotice(data.statuses.some(status => status.state === "error" || status.partial) ? "일부 정보만 확인했어요. 확인된 편의가 있는 후보만 비교합니다." : `${selectedRegion}에서 후보를 살펴봤어요. 현재 일정과 여행 조건은 유지했습니다.`);
      }
    } catch { if (!controller.signal.aborted) setNotice("새 후보를 불러오지 못했어요. 현재 일정과 이전 결과는 그대로입니다."); }
    finally { if (pending.current === controller) { pending.current = null; setLoading(false); } }
  }

  function rememberSeen(ids: string[]) {
    const next = [...new Set([...readSeen(), ...seen, ...ids])].filter(id => /^[1-9]\d{0,11}$/.test(id)).slice(-200);
    setSeen(next); try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* Current view still advances. */ }
  }
  const usableCurrent = current && (profiles.length === 0 || requiredKeys.length > 0);
  const pool = relevantExtra ? relevantExtra.data.places : usableCurrent ? places : [];
  return { places: pool, requiredKeys: relevantExtra?.data.criteria?.facilityKeys || requiredKeys, current: Boolean(relevantExtra) || usableCurrent,
    selectedRegion, setSelectedRegion, regions: nearbyAlternativeRegions(region), loading, notice, search, seen, rememberSeen,
    cancel: () => { pending.current?.abort(); setNotice("후보 찾기를 중단했어요. 현재 일정은 그대로입니다."); },
    source: relevantExtra ? `${relevantExtra.region} · ${relevantExtra.themes === "history" ? "역사·문화" : "고른 활동 유지"}` : "현재 검색 결과",
  };
}
