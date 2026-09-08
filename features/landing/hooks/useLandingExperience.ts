"use client";

import { useState } from "react";
import { useLandingMotion } from "./useLandingMotion";
import { useLandingRegions } from "./useLandingRegions";

export function useLandingExperience() {
  const [introReplay, setIntroReplay] = useState(0);
  const motion = useLandingMotion();
  const regions = useLandingRegions();
  return { ...motion, ...regions, introReplay, replayIntro: () => setIntroReplay((value) => value + 1) };
}
