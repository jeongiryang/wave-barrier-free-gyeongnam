"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLIENT_BUDGET_MS } from "../../../lib/request-budget.js";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import { plannerJson, planFailureKind } from "../services/api";
import { planResponse } from "../services/plan-response";
import type { PlanData } from "../types";
import { criteriaSignature } from "../../../lib/planner-criteria.js";
import { planNotices } from "../condition-copy";
import { readPlanResultCache, writePlanResultCache } from '../../../lib/plan-result-cache.js';

interface PlanRunOptions {
  resetRouteData: () => void;
  resetAudio: () => void;
  requestedTheme?: string;
  requestedRegion?: string;
  requestedFacilities?: string[];
  page?: number;
  onRevealResults?: () => void;
}

export function usePlanRequest({ locale, region, selected, theme }: { locale: string; region: string; selected: string[]; theme: string }) {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const latestPlan = useRef<PlanData | null>(null);
  const getPlan = useCallback(() => latestPlan.current, []);
  const [loading, setLoading] = useState(false);
  const [planError, setPlanError] = useState<ReturnType<typeof planFailureKind> | "">("");
  const [noticeKind, setNoticeKind] = useState<keyof typeof planNotices>("idle");
  const notice = planNotices[noticeKind][locale === "en" ? 1 : 0];
  const [resultSignature, setResultSignature] = useState("");
  const [recentPlan, setRecentPlan] = useState<{ signature: string; plan: PlanData; checkedAt: string; source: string } | null>(null);
  const [usingRecent, setUsingRecent] = useState<{ signature: string; checkedAt: string; source: string } | null>(null);
  const signature = criteriaSignature({ region, themes: theme, selected, locale });
  const dirty = Boolean(plan && resultSignature !== signature);
  const planRequestRef = useRef<AbortController | null>(null);
  const revealRef = useRef<(() => void) | null>(null);
  const requestSignatureRef = useRef("");

  const abortPlan = useCallback(() => { planRequestRef.current?.abort(); revealRef.current?.(); }, []);
  const runPlan = useCallback(async ({ resetAudio, requestedTheme = theme, requestedRegion = region, requestedFacilities = selected, page = 1, onRevealResults }: PlanRunOptions, revealResults = true) => {
    if (!requestedRegion) return false;
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
    let userInteracted = false;
    const restoreRequestFocus = () => {
      const control = requestControl as HTMLElement | null | undefined;
      if (!control || typeof control.focus !== 'function' || typeof window.requestAnimationFrame !== 'function') return;
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        // A result render can temporarily remove focus from the select/button
        // that started it. Restore only that accidental loss; never override a
        // control the traveller deliberately focused while waiting.
        if (!userInteracted && control.isConnected) control.focus({ preventScroll: true });
      }));
    };
    const onInteraction = (event: Event) => {
      // A stage heading focused by this navigation is part of the request,
      // not a new user decision. Pointer/key input still cancels beforehand.
      if (event.type === "focusin" && (event.target as HTMLElement | null)?.getAttribute?.("data-stage-focusing") === "true") return;
      if (event.target === requestControl && (event.type === "pointerdown"
        || (event.type === "keydown" && ["Enter", " "].includes((event as KeyboardEvent).key)))) return;
      userInteracted = true;
      cancelReveal();
    };
    // A delayed result must not move someone who has already continued using the page.
    for (const type of ["pointerdown", "wheel", "touchstart", "keydown", "focusin"]) {
      window.addEventListener(type, onInteraction, { capture: true, passive: true, signal: reveal.signal });
    }
    const controller = new AbortController();
    controller.signal.addEventListener("abort", cancelReveal, { once: true });
    planRequestRef.current = controller;
    const requestedSignature = criteriaSignature({ region: requestedRegion, themes: requestedTheme, selected: requestedFacilities, locale });
    requestSignatureRef.current = requestedSignature;
    setLoading(true);
    setPlanError("");
    setRecentPlan(null);
    setUsingRecent(null);
    setNoticeKind("loading");
    try {
      const params = new URLSearchParams({ action: "plan", region: requestedRegion, themes: requestedTheme, facilityKeys: requestedFacilities.join(","), profiles: requestedFacilities.join(","), page: String(page), locale });
      const response = await plannerJson<unknown>(`/api/wave?${params.toString()}`, { signal: controller.signal, timeoutMs: CLIENT_BUDGET_MS.plan });
      if (controller.signal.aborted) return false;
      const data = planResponse(response);
      const actualPlaces = [...data.places, ...(data.explorationPlaces || [])];
      const providerFailed = data.statuses.some(status => ['tour', 'barrierfree'].includes(status.id) && status.state === 'error');
      const providerWorked = data.statuses.some(status => ['tour', 'barrierfree'].includes(status.id) && (status.state === 'live' || status.partial));
      if (!actualPlaces.length && providerFailed && !providerWorked) {
        const cached = readPlanResultCache(window.localStorage, requestedSignature);
        if (cached) try { setRecentPlan({ signature: requestedSignature, plan: planResponse(cached.plan), checkedAt: cached.checkedAt, source: cached.source }); } catch { setRecentPlan(null); }
      }
      resetAudio();
      // Search results do not change the saved itinerary or its selected route.
      // The itinerary workspace refreshes routes only when that journey changes.
      const previous = latestPlan.current;
      const incomingIds = new Set([...data.places, ...(data.explorationPlaces || []), ...(data.excludedPlaces || [])].map(place => place.id));
      const merge = (old: typeof data.places = [], next: typeof data.places = []) => [...old.filter(place => !incomingIds.has(place.id)), ...next];
      const nextPlan = page > 1 && previous && requestedSignature === resultSignature ? { ...data,
        places: merge(previous.places, data.places),
        explorationPlaces: merge(previous.explorationPlaces, data.explorationPlaces),
        excludedPlaces: merge(previous.excludedPlaces, data.excludedPlaces),
      } : data;
      latestPlan.current = nextPlan; setPlan(nextPlan);
      if (page === 1) writePlanResultCache(window.localStorage, requestedSignature, nextPlan);
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
      restoreRequestFocus();
      return true;
    } catch (error) {
      cancelReveal();
      if (controller.signal.aborted) return false;
      const message = planFailureKind(error, navigator.onLine !== false);
      setPlanError(message);
      const cached = readPlanResultCache(window.localStorage, requestedSignature);
      if (cached) try { setRecentPlan({ signature: requestedSignature, plan: planResponse(cached.plan), checkedAt: cached.checkedAt, source: cached.source }); } catch { setRecentPlan(null); }
      setNoticeKind(navigator.onLine === false ? "offline" : "error");
      return false;
    } finally {
      if (planRequestRef.current === controller) {
        planRequestRef.current = null;
        setLoading(false);
      }
    }
  }, [locale, region, selected, theme, resultSignature]);

  useEffect(() => {
    if (requestSignatureRef.current !== signature) { planRequestRef.current?.abort(); revealRef.current?.(); }
  }, [signature]);

  useEffect(() => () => { planRequestRef.current?.abort(); revealRef.current?.(); }, []);
  const resetPlan = useCallback(() => {
    planRequestRef.current?.abort(); planRequestRef.current = null; revealRef.current?.();
    latestPlan.current = null; setPlan(null); setLoading(false); setPlanError(""); setRecentPlan(null); setUsingRecent(null); setResultSignature(""); setNoticeKind("idle");
  }, []);
  const acceptPreparedPlan = useCallback((prepared: PlanData, criteria: { region: string; profiles: string[]; themes: string[] }) => {
    planRequestRef.current?.abort(); revealRef.current?.();
    const nextSignature = criteriaSignature({ region: criteria.region, themes: criteria.themes.join(','), selected: criteria.profiles, locale });
    requestSignatureRef.current = nextSignature; setResultSignature(nextSignature); latestPlan.current = prepared; setPlan(prepared); setLoading(false); setPlanError(''); setRecentPlan(null); setUsingRecent(null); setNoticeKind('updated');
  }, [locale]);
  const matchingRecentPlan = recentPlan?.signature === signature ? recentPlan : null;
  const activeRecent = usingRecent?.signature === signature ? usingRecent : null;
  const resultCurrent = Boolean(plan && !dirty && !loading && !planError && !activeRecent);
  const useRecentPlan = useCallback(() => {
    if (!matchingRecentPlan) return false;
    latestPlan.current = matchingRecentPlan.plan; setPlan(matchingRecentPlan.plan); setResultSignature(signature); setPlanError(''); setNoticeKind('error'); setUsingRecent({ signature, checkedAt: matchingRecentPlan.checkedAt, source: matchingRecentPlan.source }); setRecentPlan(null); return true;
  }, [matchingRecentPlan, signature]);
  const requestState = loading ? "loading" : dirty ? "dirty" : planError ? "error" : plan ? plan.places.length ? "success" : plan.statuses.some(status => status.state === "error") ? "error" : "empty" : region && theme ? "ready" : "idle";
  return { getPlan, resetPlan, acceptPreparedPlan, plan, loading, planError, recentPlan: matchingRecentPlan, usingRecent: activeRecent, useRecentPlan, notice, setNotice: setNoticeKind, runPlan, abortPlan, dirty, resultCurrent, requestState };
}
