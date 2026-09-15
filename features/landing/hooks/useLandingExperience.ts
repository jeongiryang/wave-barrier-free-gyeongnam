"use client";

import { useLandingMotion } from "./useLandingMotion";
import { useLandingRegions } from "./useLandingRegions";

export function useLandingExperience() {
  const motion = useLandingMotion();
  const regions = useLandingRegions();
  return { ...motion, ...regions };
}
