"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLIENT_BUDGET_MS } from "../../../lib/request-budget.js";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import { plannerJson } from "../services/api";
import type { PlanData } from "../types";
import { criteriaSignature } from "../../../lib/planner-criteria.js";
import { planNotices } from "../condition-copy";

interface PlanRunOptions {
  resetRouteData: () => void;
  resetAudio: () => void;
  requestedTheme?: string;
}

export function usePlanRequest({ locale, region, selected, theme }: { locale: string; region: string; selected: string[]; theme: string }) {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [noticeKind, setNoticeKind] = useState<keyof typeof planNotices>("idle");
  const notice = planNotices[noticeKind][locale === "en" ? 1 : 0];
  const [resultSignature, setResultSignature] = useState("");
  const signature = criteriaSignature({ region, themes: theme, selected, locale });
  const dirty = Boolean(plan && resultSignature !== signature);
  const planRequestRef = useRef<AbortController | null>(null);
  const requestSignatureRef = useRef("");

  const abortPlan = useCallback(() => { planRequestRef.current?.abort(); }, []);
  const runPlan = useCallback(async ({ resetRouteData, resetAudio, requestedTheme = theme }: PlanRunOptions, revealResults = true) => {
    if (!region || !requestedTheme || !selected.length || loading) return false;
    planRequestRef.current?.abort();
    const controller = new AbortController();
    planRequestRef.current = controller;
    const requestedSignature = criteriaSignature({ region, themes: requestedTheme, selected, locale });
    requestSignatureRef.current = requestedSignature;
    setLoading(true);
    setPlanError("");
    setNoticeKind("loading");
    try {
      const params = new URLSearchParams({ action: "plan", region, themes: requestedTheme, profiles: selected.join(","), locale });
      const data = await plannerJson<PlanData>(`/api/wave?${params.toString()}`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.plan });
      if (controller.signal.aborted) return false;
      resetAudio();
      resetRouteData();
      setPlan(data);
      setResultSignature(requestedSignature);
      const available = data.statuses.some((status) => status.state === "live");
      setNoticeKind(available ? "updated" : "empty");
      if (revealResults) window.setTimeout(() => scrollToSection("places"), 80);
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      const message = error instanceof Error ? error.message : "연결 상태를 확인해 주세요.";
      setPlanError(message);
      setNoticeKind(navigator.onLine === false ? "offline" : "error");
      return false;
    } finally {
      if (planRequestRef.current === controller) {
        planRequestRef.current = null;
        setLoading(false);
      }
    }
  }, [locale, region, selected, theme, loading]);

  useEffect(() => {
    if (requestSignatureRef.current !== signature) planRequestRef.current?.abort();
  }, [signature]);

  useEffect(() => () => { planRequestRef.current?.abort(); }, []);
  const resultCurrent = Boolean(plan && !dirty && !loading && !planError);
  const requestState = loading ? "loading" : dirty ? "dirty" : planError ? "error" : plan ? plan.places.length ? "success" : "empty" : selected.length ? "ready" : "idle";
  return { plan, loading, planError, notice, setNotice: setNoticeKind, runPlan, abortPlan, dirty, resultCurrent, requestState };
}
