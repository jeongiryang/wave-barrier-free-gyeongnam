"use client";

import { useCallback, useEffect, useState } from "react";
import { regions } from "../constants";
import { useTravelPreferenceProfile } from "./useTravelPreferenceProfile";
import { selectedThemes } from "../../../lib/planner-criteria.js";
import { readTripValue, writeTripValue, REGION_KEY, THEMES_KEY } from "../../../lib/current-trip-storage.js";

export function usePlannerCriteria() {
  const [selected, setSelected] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [criteriaReady, setCriteriaReady] = useState(false);
  const [themes, setThemes] = useState<string[]>([]);
  const theme = themes.join(",");
  const setTheme = useCallback((value: string) => setThemes(selectedThemes(value)), []);
  const toggleTheme = useCallback((id: string) => setThemes((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : selectedThemes([...current, id])), []);
  const travelProfile = useTravelPreferenceProfile();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const query = new URLSearchParams(window.location.search);
      const queryRegion = query.get("region");
      let existingRegion = "";
      let hasSaved = false;
      try {
        hasSaved = JSON.parse(readTripValue(window.localStorage, "wave-saved-places") || "[]").length > 0;
        const catalog = JSON.parse(readTripValue(window.localStorage, "wave-saved-place-catalog-v1") || "[]");
        existingRegion = readTripValue(window.localStorage, REGION_KEY) || catalog[0]?.city || "";
        const savedThemes = JSON.parse(readTripValue(window.localStorage, THEMES_KEY) || "[]");
        setThemes(selectedThemes(!hasSaved && (query.has("themes") || query.has("theme"))
          ? query.get("themes") ?? query.get("theme") : savedThemes));
      } catch { /* Invalid storage must not authorize merging trips. */ }
      if (hasSaved) { if (regions.includes(existingRegion)) setRegion(existingRegion); }
      else if (queryRegion && regions.includes(queryRegion)) setRegion(queryRegion);
      else if (regions.includes(existingRegion)) setRegion(existingRegion);
      setCriteriaReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!criteriaReady) return;
    try { writeTripValue(window.localStorage, THEMES_KEY, JSON.stringify(themes)); } catch { /* Blocked storage does not prevent editing. */ }
    const url = new URL(window.location.href);
    if (!url.searchParams.has("theme") && !url.searchParams.has("themes")) return;
    url.searchParams.delete("theme");
    if (theme) url.searchParams.set("themes", theme);
    else url.searchParams.delete("themes");
    window.history.replaceState(window.history.state, "", url);
  }, [criteriaReady, theme, themes]);

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
    criteriaReady,
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
