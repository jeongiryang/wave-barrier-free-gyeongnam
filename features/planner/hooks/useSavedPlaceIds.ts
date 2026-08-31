"use client";

import { useCallback, useEffect, useState } from "react";

const SAVED_PLACES_KEY = "wave-saved-places";

function readSavedPlaceIds() {
  try {
    const stored = window.localStorage.getItem(SAVED_PLACES_KEY);
    const parsed = stored ? JSON.parse(stored) as unknown : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function useSavedPlaceIds() {
  const [saved, setSaved] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSaved(readSavedPlaceIds());
      setStorageReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(saved));
    } catch {
      // 저장소가 차단돼도 현재 탭의 여행 설계는 유지한다.
    }
  }, [saved, storageReady]);

  const addSavedIds = useCallback((ids: string[]) => {
    setSaved((current) => [...current, ...ids.filter((id) => !current.includes(id))]);
  }, []);

  const toggleSavedId = useCallback((id: string) => {
    setSaved((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }, []);

  return { saved, storageReady, addSavedIds, toggleSavedId };
}
