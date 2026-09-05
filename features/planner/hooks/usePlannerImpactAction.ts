"use client";

import { useCallback } from "react";

export function usePlannerImpactAction({ onCultureSearch, onReplaceAlternative }: {
  onCultureSearch: () => Promise<void>;
  onReplaceAlternative: () => void;
}) {
  const applyImpactAction = useCallback((action: "culture" | "alternative") => {
    if (action === "culture") {
      void onCultureSearch();
      return;
    }
    onReplaceAlternative();
  }, [onCultureSearch, onReplaceAlternative]);
  return { applyImpactAction };
}
