"use client";

import { useEffect, useState } from "react";
import { optionalPlannerJson } from "../services/api";
import type { KeyHealth } from "../types";

export function useServiceHealth() {
  const [keyHealth, setKeyHealth] = useState<KeyHealth | null>(null);
  const [keyHealthChecked, setKeyHealthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void optionalPlannerJson<KeyHealth>("/api/health")
      .then((data) => { if (!cancelled && data) setKeyHealth(data); })
      .finally(() => { if (!cancelled) setKeyHealthChecked(true); });
    return () => { cancelled = true; };
  }, []);

  return { keyHealth, keyHealthChecked };
}
