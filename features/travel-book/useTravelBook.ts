"use client";
import { replaceTripWithBackup } from "../../lib/trip-import.js";
import { getTabStorage } from "../../lib/session-storage.js";

import { useCallback, useEffect, useState } from "react";
import { emptyTrip, THEMES_KEY } from "../../lib/current-trip-storage.js";
import { useRouter } from "next/navigation";
import {
  TRAVEL_BOOK_STORAGE_KEY,
  createTravelBookSnapshot,
  patchTravelBook,
  removeTravelBook,
  sanitizeTravelBooks,
  travelBookRestorePayload,
  upsertTravelBook,
  type TravelBook,
  type TravelBookInput,
} from "../../lib/travel-book.js";
import { SAVED_PLACE_CATALOG_KEY, sanitizeSavedPlaceCatalog } from "../../lib/saved-place-catalog.js";
import { saveSessionProfiles } from '../../lib/session-travel-profiles.js';

const SAVED_PLACES_KEY = "wave-saved-places";
const TRIP_SCHEDULE_KEY = "wave-trip-schedule-v1";

export function useTravelBook() {
  const router = useRouter();
  const [books, setBooks] = useState<TravelBook[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState('');

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setBooks(sanitizeTravelBooks(JSON.parse(window.localStorage.getItem(TRAVEL_BOOK_STORAGE_KEY) || "[]")));
      } catch {
        setStorageError('저장한 여행을 읽지 못했습니다. 브라우저 저장 공간을 확인한 뒤 다시 시도해 주세요.');
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const commit = useCallback((change: (current: TravelBook[]) => TravelBook[]) => {
    try {
      const current = sanitizeTravelBooks(JSON.parse(window.localStorage.getItem(TRAVEL_BOOK_STORAGE_KEY) || '[]'));
      const next = change(current);
      window.localStorage.setItem(TRAVEL_BOOK_STORAGE_KEY, JSON.stringify(next));
      setBooks(next); setStorageError(''); return true;
    } catch {
      setStorageError('기기에 저장하지 못했어요. 입력은 그대로 두고 저장 공간을 확인한 뒤 다시 시도해 주세요.'); return false;
    }
  }, []);

  const archive = useCallback((input: TravelBookInput) => {
    const snapshot = createTravelBookSnapshot(input);
    if (!snapshot) return null;
    return commit(current => upsertTravelBook(current, snapshot)) ? snapshot : null;
  }, [commit]);

  const update = useCallback((id: string, patch: Partial<Pick<TravelBook, "status" | "note" | "title">>) => {
    return commit((current) => patchTravelBook(current, id, patch));
  }, [commit]);

  const remove = useCallback((id: string) => {
    return commit((current) => removeTravelBook(current, id));
  }, [commit]);

  const restore = useCallback((book: TravelBook) => {
    const payload = travelBookRestorePayload(book);
    if (!payload) return false;
    try {
      replaceTripWithBackup(window.localStorage, {
        ...emptyTrip(book.region, payload.schedule.travelStart, payload.schedule.travelEnd),
        [SAVED_PLACES_KEY]: JSON.stringify(payload.savedPlaceIds),
        [SAVED_PLACE_CATALOG_KEY]: JSON.stringify(sanitizeSavedPlaceCatalog(payload.savedPlaces)),
        [TRIP_SCHEDULE_KEY]: JSON.stringify(payload.schedule),
        [THEMES_KEY]: JSON.stringify(payload.themes),
        "wave-trip-order-v1": JSON.stringify({ mode: "manual", ids: payload.savedPlaceIds }),
      });
      saveSessionProfiles(getTabStorage(), payload.profiles);
    } catch {
      setStorageError('이 일정을 열지 못했어요. 현재 여행은 유지됩니다. 브라우저 저장 공간을 확인해 주세요.'); return false;
    }
    router.push(payload.href);
    return true;
  }, [router]);

  return { books, hydrated, storageError, archive, update, remove, restore };
}
