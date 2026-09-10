"use client";

import { useEffect, useState } from "react";

export type LoginMethods = { password: boolean; kakao: boolean };

export function useLoginMethods(enabled: boolean, userId?: string) {
  const [methods, setMethods] = useState<LoginMethods | null>(null);
  useEffect(() => {
    if (!enabled || !userId) return;
    const controller = new AbortController();
    fetch("/api/account/login-methods", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<LoginMethods> : null)
      .then((result) => { if (!controller.signal.aborted) setMethods(result); })
      .catch(() => {});
    return () => controller.abort();
  }, [enabled, userId]);
  return { methods, setMethods };
}
