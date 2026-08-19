"use client";

import { useCallback, useEffect, useState } from "react";
import type { Motion } from "../preferences/types";

export const INTRO_DURATION_MS = 2450;
export type IntroState = "checking" | "show" | "hidden";

export function decideIntroState({ hydrated, motion, reducedMotion, seen }: {
  hydrated: boolean;
  motion: Motion;
  reducedMotion: boolean;
  seen: boolean;
}): IntroState {
  if (!hydrated) return "checking";
  return motion === "calm" || reducedMotion || seen ? "hidden" : "show";
}

export function useLandingIntro({ hydrated, motion }: { hydrated: boolean; motion: Motion }) {
  const [introState, setIntroState] = useState<IntroState>("checking");

  const finishIntro = useCallback(() => {
    try {
      window.sessionStorage.setItem("wave-intro-seen-v2", "1");
    } catch {
      // 세션 저장소가 차단돼도 인트로는 정상적으로 닫는다.
    }
    setIntroState("hidden");
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = window.sessionStorage.getItem("wave-intro-seen-v2") === "1";
      if (motion === "calm" || reducedMotion) window.sessionStorage.setItem("wave-intro-seen-v2", "1");
    } catch {
      // 세션 저장소가 차단돼도 현재 방문의 모션 설정은 지킨다.
    }
    const nextState = decideIntroState({ hydrated, motion, reducedMotion, seen });
    const frame = window.requestAnimationFrame(() => setIntroState(nextState));
    return () => window.cancelAnimationFrame(frame);
  }, [hydrated, motion]);

  useEffect(() => {
    if (introState !== "show") return;
    const timer = window.setTimeout(finishIntro, INTRO_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [finishIntro, introState]);

  return { introState, finishIntro };
}
