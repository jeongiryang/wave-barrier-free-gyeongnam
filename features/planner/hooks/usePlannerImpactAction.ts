"use client";

import { useCallback } from "react";
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
      window.setTimeout(() => document.getElementById("places")?.scrollIntoView({ behavior: "smooth" }), 700);
      return;
    }
    if (!impactAlternative) return;
    void loadRoutes(impactAlternative);
    document.getElementById("navigation")?.scrollIntoView({ behavior: "smooth" });
  }, [impactAlternative, loadRoutes, setNotice, setTheme]);
  return { applyImpactAction };
}
