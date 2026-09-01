"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLIENT_BUDGET_MS } from "../../../lib/request-budget.js";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import { plannerJson } from "../services/api";
import type { Place, PlanData } from "../types";

interface PlanRunOptions {
  resetRouteData: () => void;
  resetAudio: () => void;
  loadInitialRoute: (places: Place[]) => void;
}

export function usePlanRequest({ locale, region, selected, theme }: { locale: string; region: string; selected: string[]; theme: string }) {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [notice, setNotice] = useState("조건을 바꾸면 실시간 관광 데이터가 자동으로 갱신됩니다.");
  const planRequestRef = useRef<AbortController | null>(null);

  const abortPlan = useCallback(() => { planRequestRef.current?.abort(); }, []);
  const runPlan = useCallback(async ({ resetRouteData, resetAudio, loadInitialRoute }: PlanRunOptions, revealResults = true) => {
    if (!selected.length) return;
    planRequestRef.current?.abort();
    const controller = new AbortController();
    planRequestRef.current = controller;
    setLoading(true);
    setPlanError("");
    setPlan(null);
    resetRouteData();
    setNotice(revealResults ? "공식 관광정보에서 맞는 여행지를 찾고 있어요." : "바뀐 조건에 맞춰 여행지를 자동으로 갱신하고 있어요.");
    try {
      const params = new URLSearchParams({ action: "plan", region, theme, profiles: selected.join(","), locale });
      const data = await plannerJson<PlanData>(`/api/wave?${params.toString()}`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.plan });
      if (controller.signal.aborted) return;
      resetAudio();
      setPlan(data);
      if (data.places.length) loadInitialRoute(data.places);
      const available = data.statuses.some((status) => status.state === "live");
      setNotice(available ? "공식 관광정보를 확인해 추천을 업데이트했습니다." : "공식 데이터에서 현재 조건에 맞는 결과를 확인하지 못했습니다.");
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : "연결 상태를 확인해 주세요.";
      setPlanError(message);
      setNotice(`공식 관광 데이터를 불러오지 못했습니다. 임의의 장소를 대신 표시하지 않습니다. ${message}`);
    } finally {
      if (planRequestRef.current === controller) {
        planRequestRef.current = null;
        setLoading(false);
        if (revealResults) window.setTimeout(() => scrollToSection("places"), 80);
      }
    }
  }, [locale, region, selected, theme]);

  useEffect(() => () => { planRequestRef.current?.abort(); }, []);
  return { plan, loading, planError, notice, setNotice, runPlan, abortPlan };
}
