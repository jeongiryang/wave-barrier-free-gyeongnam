"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLIENT_BUDGET_MS } from "../../../lib/request-budget.js";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import { plannerJson } from "../services/api";
import type { PlanData } from "../types";
import { criteriaSignature } from "../../../lib/planner-criteria.js";

interface PlanRunOptions {
  resetRouteData: () => void;
  resetAudio: () => void;
}

export function usePlanRequest({ locale, region, selected, theme }: { locale: string; region: string; selected: string[]; theme: string }) {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [notice, setNotice] = useState("필요한 편의를 고른 뒤 여행지 찾기를 눌러주세요.");
  const [resultSignature, setResultSignature] = useState("");
  const signature = criteriaSignature({ region, themes: theme, selected, locale });
  const dirty = Boolean(plan && resultSignature !== signature);
  const planRequestRef = useRef<AbortController | null>(null);

  const abortPlan = useCallback(() => { planRequestRef.current?.abort(); }, []);
  const runPlan = useCallback(async ({ resetRouteData, resetAudio }: PlanRunOptions, revealResults = true) => {
    if (!region || !theme || !selected.length || loading) return false;
    planRequestRef.current?.abort();
    const controller = new AbortController();
    planRequestRef.current = controller;
    setLoading(true);
    setPlanError("");
    setNotice(locale === "en" ? "Finding places with information about your needs." : "필요한 편의가 확인된 여행지를 찾고 있어요.");
    try {
      const params = new URLSearchParams({ action: "plan", region, themes: theme, profiles: selected.join(","), locale });
      const data = await plannerJson<PlanData>(`/api/wave?${params.toString()}`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.plan });
      if (controller.signal.aborted) return false;
      resetAudio();
      resetRouteData();
      setPlan(data);
      setResultSignature(signature);
      const available = data.statuses.some((status) => status.state === "live");
      setNotice(available ? "공식 관광정보를 확인해 추천을 업데이트했습니다." : "공식 데이터에서 현재 조건에 맞는 결과를 확인하지 못했습니다.");
      if (revealResults) window.setTimeout(() => scrollToSection("places"), 80);
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      const message = error instanceof Error ? error.message : "연결 상태를 확인해 주세요.";
      setPlanError(message);
      setNotice(navigator.onLine === false ? "인터넷 연결이 끊겼어요. 기존 일정은 이 기기에서 계속 확인할 수 있습니다." : `여행지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요. ${message}`);
      return false;
    } finally {
      if (planRequestRef.current === controller) {
        planRequestRef.current = null;
        setLoading(false);
      }
    }
  }, [locale, region, selected, theme, signature, loading]);

  useEffect(() => {
    planRequestRef.current?.abort();
  }, [signature]);

  useEffect(() => () => { planRequestRef.current?.abort(); }, []);
  const resultCurrent = Boolean(plan && !dirty && !loading && !planError);
  const requestState = loading ? "loading" : dirty ? "dirty" : planError ? "error" : plan ? plan.places.length ? "success" : "empty" : selected.length ? "ready" : "idle";
  return { plan, loading, planError, notice, setNotice, runPlan, abortPlan, dirty, resultCurrent, requestState };
}
