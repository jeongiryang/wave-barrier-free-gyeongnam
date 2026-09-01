"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import type { Motion } from "../../preferences/types";

export type JourneyStepId = "conditions" | "places" | "itinerary" | "departure-readiness";

export interface JourneyStep {
  id: JourneyStepId;
  index: number;
  label: string;
  detail: string;
  complete: boolean;
}

interface JourneyProgressOptions {
  motion: Motion;
  observeSections?: boolean;
  selectedProfileCount: number;
  recommendedCount: number;
  savedCount: number;
  routeDestinationName: string;
  weatherReady: boolean;
}

const STEP_IDS: JourneyStepId[] = ["conditions", "places", "itinerary", "departure-readiness"];

export function useJourneyProgress({
  motion, observeSections = true,
  selectedProfileCount,
  recommendedCount,
  savedCount,
  routeDestinationName,
  weatherReady,
}: JourneyProgressOptions) {
  const [activeStepId, setActiveStepId] = useState<JourneyStepId>("conditions");

  const steps = useMemo<JourneyStep[]>(() => [
    {
      id: "conditions",
      index: 1,
      label: "조건",
      detail: selectedProfileCount ? `편의 ${selectedProfileCount}개 선택` : "필요한 편의를 선택",
      complete: selectedProfileCount > 0,
    },
    {
      id: "places",
      index: 2,
      label: "여행지",
      detail: recommendedCount ? `공식 근거 추천 ${recommendedCount}곳` : "공식 추천을 확인",
      complete: savedCount > 0,
    },
    {
      id: "itinerary",
      index: 3,
      label: "내 일정",
      detail: savedCount ? `${savedCount}곳을 일정에 저장` : "장소를 일정에 추가",
      complete: savedCount > 0 && Boolean(routeDestinationName),
    },
    {
      id: "departure-readiness",
      index: 4,
      label: "출발 확인",
      detail: weatherReady && routeDestinationName ? "날씨·경로를 불러옴" : "최신 정보를 재확인",
      complete: savedCount > 0 && Boolean(routeDestinationName) && weatherReady,
    },
  ], [recommendedCount, routeDestinationName, savedCount, selectedProfileCount, weatherReady]);

  useEffect(() => {
    if (!observeSections) return;
    const sections = STEP_IDS.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top));
      const id = visible[0]?.target.id as JourneyStepId | undefined;
      if (id && STEP_IDS.includes(id)) setActiveStepId(id);
    }, { rootMargin: "-18% 0px -64%", threshold: [0, 0.08, 0.2] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [observeSections]);

  const goToStep = useCallback((id: JourneyStepId) => {
    setActiveStepId(id);
    if (typeof window === "undefined") return false;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => scrollToSection(id, motion === "calm"));
    });
    return true;
  }, [motion]);

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
