"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SAVED_PLACE_CATALOG_KEY,
  mergeSavedPlaceCatalog,
  removeSavedPlaceSnapshot,
  sanitizeSavedPlaceCatalog,
  type SavedPlaceSnapshot,
} from "../../../lib/saved-place-catalog.js";
import type { Place } from "../types";

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
  const [catalog, setCatalog] = useState<SavedPlaceSnapshot[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSaved(readSavedPlaceIds());
      try {
        setCatalog(sanitizeSavedPlaceCatalog(JSON.parse(window.localStorage.getItem(SAVED_PLACE_CATALOG_KEY) || "[]")));
      } catch {
        setCatalog([]);
      }
      setStorageReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(saved));
      window.localStorage.setItem(SAVED_PLACE_CATALOG_KEY, JSON.stringify(catalog.filter((place) => saved.includes(place.id))));
    } catch {
      // 저장소가 차단돼도 현재 탭의 여행 설계는 유지한다.
    }
  }, [catalog, saved, storageReady]);

  const addSavedIds = useCallback((ids: string[], places: Place[] = []) => {
    setSaved((current) => [...current, ...ids.filter((id) => !current.includes(id))]);
    setCatalog((current) => mergeSavedPlaceCatalog(current, places.filter((place) => ids.includes(place.id))));
  }, []);

  const removeSavedId = useCallback((id: string) => {
    setSaved((current) => current.filter((item) => item !== id));
    setCatalog((current) => removeSavedPlaceSnapshot(current, id));
  }, []);

  const rememberSavedPlaces = useCallback((places: Place[]) => {
    setCatalog((current) => mergeSavedPlaceCatalog(current, places));
  }, []);

  const replaceSavedId = useCallback((previousId: string, place: Place) => {
    setSaved((current) => current.map((id) => id === previousId ? place.id : id));
    setCatalog((current) => mergeSavedPlaceCatalog(removeSavedPlaceSnapshot(current, previousId), [place]));
  }, []);

  return { saved, catalog, storageReady, addSavedIds, removeSavedId, rememberSavedPlaces, replaceSavedId };
}
