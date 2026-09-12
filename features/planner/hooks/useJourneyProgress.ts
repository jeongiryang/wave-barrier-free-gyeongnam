"use client";

import { useCallback, useEffect, useMemo } from "react";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import type { Motion } from "../../preferences/types";
import { useSitePreferences } from "../../../components/SitePreferences";

export type JourneyStepId = "conditions" | "places" | "itinerary" | "departure-readiness";

export interface JourneyStep {
  id: JourneyStepId;
  index: number;
  label: string;
  detail: string;
  complete: boolean;
  available: boolean;
}

interface JourneyProgressOptions {
  motion: Motion;
  tripReady?: boolean;
  observeSections?: boolean;
  activeStepId: JourneyStepId;
  onActiveStepChange: (id: JourneyStepId, navigate?: boolean) => void;
  selectedProfileCount: number;
  recommendedCount: number;
  savedCount: number;
  currentSavedCount: number;
  routeDestinationName: string;
  weatherReady: boolean;
  searched?: boolean;
  resultsAvailable?: boolean;
  reviewed?: boolean;
  itineraryReviewed?: boolean;
}

const STEP_IDS: JourneyStepId[] = ["conditions", "places", "itinerary", "departure-readiness"];

export function useJourneyProgress({
  motion, observeSections = true,
  tripReady = true,
  activeStepId,
  onActiveStepChange,
  selectedProfileCount,
  recommendedCount,
  savedCount,
  currentSavedCount,
  routeDestinationName,
  weatherReady,
  searched = false,
  resultsAvailable = searched,
  reviewed = false,
  itineraryReviewed = false,
}: JourneyProgressOptions) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const steps = useMemo<JourneyStep[]>(() => [
    {
      id: "conditions",
      index: 1,
      label: en ? "Preferences" : "조건",
      detail: selectedProfileCount ? en ? `${selectedProfileCount} facilities selected` : `편의 ${selectedProfileCount}개 선택` : en ? "Choose required facilities" : "필요한 편의를 선택",
      complete: searched,
      available: true,
    },
    {
      id: "places",
      index: 2,
      label: en ? "Places" : "여행지",
      detail: recommendedCount ? en ? `${recommendedCount} places with official evidence` : `공식 근거 추천 ${recommendedCount}곳` : en ? "Check recommended places" : "공식 추천을 확인",
      complete: searched && recommendedCount > 0 && currentSavedCount > 0,
      available: resultsAvailable,
    },
    {
      id: "itinerary",
      index: 3,
      label: en ? "Itinerary" : "내 일정",
      detail: savedCount ? en ? `${savedCount} places in your itinerary` : `${savedCount}곳을 일정에 저장` : en ? "Add places to your itinerary" : "장소를 일정에 추가",
      complete: searched && currentSavedCount > 0 && itineraryReviewed,
      available: savedCount > 0,
    },
    {
      id: "departure-readiness",
      index: 4,
      label: en ? "Before departure" : "출발 확인",
      detail: weatherReady && routeDestinationName ? en ? "Weather and route loaded" : "날씨·경로를 불러옴" : en ? "Recheck the latest information" : "최신 정보를 재확인",
      complete: searched && currentSavedCount > 0 && itineraryReviewed && reviewed,
      available: savedCount > 0,
    },
  ], [en, currentSavedCount, recommendedCount, routeDestinationName, savedCount, selectedProfileCount, weatherReady, searched, resultsAvailable, reviewed, itineraryReviewed]);

  useEffect(() => {
    if (!observeSections) return;
    const sections = STEP_IDS.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length || typeof IntersectionObserver === "undefined") return;
    const intersecting = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      if (document.querySelector<HTMLElement>(".journey-stage-stream")?.dataset.view !== "overview") return;
      // Entries contain threshold changes, not every visible section. A previous
      // section re-entering the band must not override a still-visible destination.
      for (const entry of entries) {
        if (entry.isIntersecting) intersecting.add(entry.target);
        else intersecting.delete(entry.target);
      }
      const visible = [...intersecting]
        .map((target) => ({ target, top: target.getBoundingClientRect().top }))
        .sort((left, right) => Math.abs(left.top) - Math.abs(right.top));
      const id = visible[0]?.target.id as JourneyStepId | undefined;
      if (id && STEP_IDS.includes(id)) onActiveStepChange(id);
    }, { rootMargin: "-18% 0px -64%", threshold: [0, 0.08, 0.2] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [observeSections, onActiveStepChange]);

  const goToStep = useCallback((id: JourneyStepId) => {
    if (!observeSections && !steps.find((step) => step.id === id)?.available) return false;
    onActiveStepChange(id, true);
    if (typeof window === "undefined") return false;
    if (window.location.hash !== `#${id}`) {
      const url = new URL(window.location.href);
      url.hash = id;
      window.history.pushState(null, "", url);
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToSection(id, motion === "calm"));
    });
    return true;
  }, [motion, onActiveStepChange, observeSections, steps]);

  useEffect(() => {
    // Storage is read after the first render. An initial zero count is not an
    // empty trip: preserve the requested URL stage until restoration finishes.
    if (!tripReady) return;
    if (!observeSections && !steps.find((step) => step.id === activeStepId)?.available) onActiveStepChange(resultsAvailable ? "places" : "conditions");
  }, [activeStepId, observeSections, onActiveStepChange, resultsAvailable, steps, tripReady]);

  const completedCount = steps.filter((step) => step.complete).length;
  const nextStep = steps.find((step) => !step.complete) || steps.at(-1)!;

  return {
    activeStepId,
    steps,
    completedCount,
    progress: Math.round((completedCount / steps.length) * 100),
    nextStep,
    goToStep,
  };
}
