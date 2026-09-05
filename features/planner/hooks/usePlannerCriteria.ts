"use client";

import { useCallback, useEffect, useState } from "react";
import { regions } from "../constants";
import { useTravelPreferenceProfile } from "./useTravelPreferenceProfile";
import { normalizeThemes } from "../../../lib/planner-criteria.js";

export function usePlannerCriteria() {
  const [selected, setSelected] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [themes, setThemes] = useState<string[]>([]);
  const theme = themes.join(",");
  const setTheme = useCallback((value: string) => setThemes(normalizeThemes(value)), []);
  const toggleTheme = useCallback((id: string) => setThemes((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : normalizeThemes([...current, id])), []);
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
    themes,
    toggleTheme,
    toggleProfile,
    clearSelectedProfiles,
    applyTravelProfile,
    ...travelProfile,
  };
}
