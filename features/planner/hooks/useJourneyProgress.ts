"use client";

import { useCallback, useEffect, useMemo } from "react";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import type { Motion } from "../../preferences/types";

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
  observeSections?: boolean;
  activeStepId: JourneyStepId;
  onActiveStepChange: (id: JourneyStepId) => void;
  selectedProfileCount: number;
  recommendedCount: number;
  savedCount: number;
  currentSavedCount: number;
  routeDestinationName: string;
  weatherReady: boolean;
  searched?: boolean;
  reviewed?: boolean;
  itineraryReviewed?: boolean;
}

const STEP_IDS: JourneyStepId[] = ["conditions", "places", "itinerary", "departure-readiness"];

export function useJourneyProgress({
  motion, observeSections = true,
  activeStepId,
  onActiveStepChange,
  selectedProfileCount,
  recommendedCount,
  savedCount,
  currentSavedCount,
  routeDestinationName,
  weatherReady,
  searched = false,
  reviewed = false,
  itineraryReviewed = false,
}: JourneyProgressOptions) {
  const steps = useMemo<JourneyStep[]>(() => [
    {
      id: "conditions",
      index: 1,
      label: "조건",
      detail: selectedProfileCount ? `편의 ${selectedProfileCount}개 선택` : "필요한 편의를 선택",
      complete: searched,
      available: true,
    },
    {
      id: "places",
      index: 2,
      label: "여행지",
      detail: recommendedCount ? `공식 근거 추천 ${recommendedCount}곳` : "공식 추천을 확인",
      complete: searched && recommendedCount > 0 && currentSavedCount > 0,
      available: searched,
    },
    {
      id: "itinerary",
      index: 3,
      label: "이 기기 일정",
      detail: savedCount ? `${savedCount}곳을 일정에 저장` : "장소를 일정에 추가",
      complete: searched && currentSavedCount > 0 && itineraryReviewed,
      available: savedCount > 0,
    },
    {
      id: "departure-readiness",
      index: 4,
      label: "출발 확인",
      detail: weatherReady && routeDestinationName ? "날씨·경로를 불러옴" : "최신 정보를 재확인",
      complete: searched && currentSavedCount > 0 && itineraryReviewed && reviewed,
      available: savedCount > 0,
    },
  ], [currentSavedCount, recommendedCount, routeDestinationName, savedCount, selectedProfileCount, weatherReady, searched, reviewed, itineraryReviewed]);

  useEffect(() => {
    if (!observeSections) return;
    const sections = STEP_IDS.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (document.querySelector<HTMLElement>(".journey-stage-stream")?.dataset.view !== "overview") return;
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top));
      const id = visible[0]?.target.id as JourneyStepId | undefined;
      if (id && STEP_IDS.includes(id)) onActiveStepChange(id);
    }, { rootMargin: "-18% 0px -64%", threshold: [0, 0.08, 0.2] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [observeSections, onActiveStepChange]);

  const goToStep = useCallback((id: JourneyStepId) => {
    if (!observeSections && !steps.find((step) => step.id === id)?.available) return false;
    onActiveStepChange(id);
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
    if (!observeSections && !steps.find((step) => step.id === activeStepId)?.available) onActiveStepChange(searched ? "places" : "conditions");
  }, [activeStepId, observeSections, onActiveStepChange, searched, steps]);

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
