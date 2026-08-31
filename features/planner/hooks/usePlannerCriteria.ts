"use client";

import { useCallback, useEffect, useState } from "react";
import { regions } from "../constants";
import { useTravelPreferenceProfile } from "./useTravelPreferenceProfile";

export function usePlannerCriteria() {
  const [selected, setSelected] = useState<string[]>(["wheel"]);
  const [region, setRegion] = useState("창원");
  const [theme, setTheme] = useState("nature");
  const travelProfile = useTravelPreferenceProfile();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const queryRegion = new URLSearchParams(window.location.search).get("region");
      if (queryRegion && regions.includes(queryRegion)) setRegion(queryRegion);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggleProfile = useCallback((id: string) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }, []);

  const applyTravelProfile = useCallback(() => {
    if (!travelProfile.savedProfile) return false;
    setSelected(travelProfile.savedProfile.selectedIds);
    travelProfile.announceProfileApplied();
    return true;
  }, [travelProfile]);

  const clearSelectedProfiles = useCallback(() => setSelected([]), []);

  return {
    selected,
    setSelected,
    region,
    setRegion,
    theme,
    setTheme,
    toggleProfile,
    clearSelectedProfiles,
    applyTravelProfile,
    ...travelProfile,
  };
}
