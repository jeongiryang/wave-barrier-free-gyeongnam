"use client";

import { useCallback } from "react";
import { scrollToSection } from "../../../lib/reduced-motion.js";
import type { Place } from "../types";

export function usePlannerImpactAction({ impactAlternative, loadRoutes, setTheme, setNotice }: {
  impactAlternative: Place | null;
  loadRoutes: (place: Place) => Promise<void>;
  setTheme: (theme: string) => void;
  setNotice: (notice: string) => void;
}) {
  const applyImpactAction = useCallback((action: "culture" | "alternative") => {
    if (action === "culture") {
      setTheme("history");
      setNotice("강수 영향을 반영해 역사·문화 후보를 다시 확인합니다.");
      window.setTimeout(() => scrollToSection("places"), 700);
      return;
    }
    if (!impactAlternative) return;
    void loadRoutes(impactAlternative);
    scrollToSection("navigation");
  }, [impactAlternative, loadRoutes, setNotice, setTheme]);
  return { applyImpactAction };
}
