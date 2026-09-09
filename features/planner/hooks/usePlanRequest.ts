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
  onRevealResults?: () => void;
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
  const revealRef = useRef<(() => void) | null>(null);
  const requestSignatureRef = useRef("");

  const abortPlan = useCallback(() => { planRequestRef.current?.abort(); revealRef.current?.(); }, []);
  const runPlan = useCallback(async ({ resetRouteData, resetAudio, requestedTheme = theme, onRevealResults }: PlanRunOptions, revealResults = true) => {
    if (!region || !requestedTheme || !selected.length || loading) return false;
    planRequestRef.current?.abort();
    revealRef.current?.();
    const reveal = new AbortController();
    let revealTimer = 0;
    let scrolling = false;
    const cancelReveal = () => {
      window.clearTimeout(revealTimer);
      reveal.abort();
      if (scrolling) window.scrollTo({ top: window.scrollY, left: window.scrollX, behavior: "instant" });
      scrolling = false;
    };
    revealRef.current = cancelReveal;
    const requestControl = window.document?.activeElement;
    const onInteraction = (event: Event) => {
      if (event.target === requestControl && (event.type === "pointerdown"
        || (event.type === "keydown" && ["Enter", " "].includes((event as KeyboardEvent).key)))) return;
      cancelReveal();
    };
    // A delayed result must not move someone who has already continued using the page.
    for (const type of ["pointerdown", "wheel", "touchstart", "keydown"]) {
      window.addEventListener(type, onInteraction, { capture: true, passive: true, signal: reveal.signal });
    }
    const controller = new AbortController();
    controller.signal.addEventListener("abort", cancelReveal, { once: true });
    planRequestRef.current = controller;
    const requestedSignature = criteriaSignature({ region, themes: requestedTheme, selected, locale });
    requestSignatureRef.current = requestedSignature;
    setLoading(true);
    setPlanError("");
    setNoticeKind("loading");
    try {
      const params = new URLSearchParams({ action: "plan", region, themes: requestedTheme, profiles: selected.join(","), locale });
      const response = await plannerJson<unknown>(`/api/wave?${params.toString()}`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.plan });
      if (controller.signal.aborted) return false;
      const { planResponse } = await import("../services/plan-response");
      if (controller.signal.aborted) return false;
      const data = planResponse(response);
      resetAudio();
      resetRouteData();
      setPlan(data);
      setResultSignature(requestedSignature);
      const available = data.statuses.some((status) => status.state === "live");
      setNoticeKind(data.statuses.some(status => status.state === "error" || status.partial) ? "error" : available ? "updated" : "empty");
      if (revealResults && !reveal.signal.aborted) onRevealResults?.();
      if (revealResults && !reveal.signal.aborted) revealTimer = window.setTimeout(() => {
        if (reveal.signal.aborted) return;
        // Async results must settle before a user presses a newly displayed card.
        scrolling = scrollToSection("places", true);
        window.addEventListener("scrollend", () => { scrolling = false; reveal.abort(); }, { once: true, signal: reveal.signal });
      }, 80);
      else cancelReveal();
      return true;
    } catch (error) {
      cancelReveal();
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
    if (requestSignatureRef.current !== signature) { planRequestRef.current?.abort(); revealRef.current?.(); }
  }, [signature]);

  useEffect(() => () => { planRequestRef.current?.abort(); revealRef.current?.(); }, []);
  const resetPlan = useCallback(() => {
    planRequestRef.current?.abort(); planRequestRef.current = null; revealRef.current?.();
    setPlan(null); setLoading(false); setPlanError(""); setResultSignature(""); setNoticeKind("idle");
  }, []);
  const resultCurrent = Boolean(plan && !dirty && !loading && !planError);
  const requestState = loading ? "loading" : dirty ? "dirty" : planError ? "error" : plan ? plan.places.length ? "success" : plan.statuses.some(status => status.state === "error") ? "error" : "empty" : selected.length ? "ready" : "idle";
  return { resetPlan, plan, loading, planError, notice, setNotice: setNoticeKind, runPlan, abortPlan, dirty, resultCurrent, requestState };
}
