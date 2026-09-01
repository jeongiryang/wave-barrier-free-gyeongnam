"use client";

import { useCallback, useEffect, useState } from "react";
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

const SAVED_PLACES_KEY = "wave-saved-places";
const TRIP_SCHEDULE_KEY = "wave-trip-schedule-v1";

export function useTravelBook() {
  const router = useRouter();
  const [books, setBooks] = useState<TravelBook[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setBooks(sanitizeTravelBooks(JSON.parse(window.localStorage.getItem(TRAVEL_BOOK_STORAGE_KEY) || "[]")));
      } catch {
        setBooks([]);
      }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(TRAVEL_BOOK_STORAGE_KEY, JSON.stringify(books));
    } catch {
      // 저장소가 차단돼도 현재 화면의 여행집은 계속 사용할 수 있다.
    }
  }, [books, hydrated]);

  const archive = useCallback((input: TravelBookInput) => {
    const snapshot = createTravelBookSnapshot(input);
    if (!snapshot) return null;
    setBooks((current) => upsertTravelBook(current, snapshot));
    return snapshot;
  }, []);

  const update = useCallback((id: string, patch: Partial<Pick<TravelBook, "status" | "note" | "title">>) => {
    setBooks((current) => patchTravelBook(current, id, patch));
  }, []);

  const remove = useCallback((id: string) => {
    setBooks((current) => removeTravelBook(current, id));
  }, []);

  const restore = useCallback((book: TravelBook) => {
    const payload = travelBookRestorePayload(book);
    if (!payload) return;
    try {
      window.localStorage.setItem(SAVED_PLACES_KEY, JSON.stringify(payload.savedPlaceIds));
      window.localStorage.setItem(TRIP_SCHEDULE_KEY, JSON.stringify(payload.schedule));
    } catch {
      return;
    }
    router.push(payload.href);
  }, [router]);

  return { books, hydrated, archive, update, remove, restore };
}
