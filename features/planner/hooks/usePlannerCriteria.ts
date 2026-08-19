"use client";

import { useCallback, useEffect, useState } from "react";
import { regions } from "../constants";

export function usePlannerCriteria() {
  const [selected, setSelected] = useState<string[]>(["wheel"]);
  const [region, setRegion] = useState("창원");
  const [theme, setTheme] = useState("nature");

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

  return { selected, setSelected, region, setRegion, theme, setTheme, toggleProfile };
}
