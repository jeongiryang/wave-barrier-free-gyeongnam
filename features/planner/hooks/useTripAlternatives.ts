"use client";
import { useCallback, useState } from "react";
import type { Place } from "../types";
import type { useTripSelection } from "./useTripSelection";
import type { AlternativeReason } from "../../../lib/trip-alternatives.js";
import type { TripCommandReceipt } from "../../../lib/trip-command.js";
import { TRAVEL_BOOK_STORAGE_KEY, sanitizeTravelBooks } from "../../../lib/travel-book.js";

type ReplacementUndo = { oldPlace: Place; receipt: TripCommandReceipt };

export function useTripAlternatives(trip: ReturnType<typeof useTripSelection>, onChanged: () => void) {
  const [request, setRequest] = useState<{ id: string; reason: AlternativeReason; seenIds: string[] } | null>(null);
  const [undo, setUndo] = useState<ReplacementUndo | null>(null), [notice, setNotice] = useState("");
  const [replacementVersion, setReplacementVersion] = useState(0);
  const original = trip.orderedSavedPlaces.find(place => place.id === request?.id);
  const close = useCallback(() => setRequest(null), []);

  function open(id: string, reason: AlternativeReason = "visited") {
    if (!trip.saved.includes(id)) return;
    let seenIds: string[] = [];
    try {
      const books = sanitizeTravelBooks(JSON.parse(localStorage.getItem(TRAVEL_BOOK_STORAGE_KEY) || "[]"));
      seenIds = [...new Set(books.filter(book => book.status === "visited").flatMap(book => book.places.map(place => place.id)))];
    } catch { /* Missing history does not prevent comparing current public results. */ }
    setRequest({ id, reason, seenIds });
  }

  function apply(place: Place) {
    if (!original) return;
    const receipt = trip.applyTripCommand({ type: 'replace', previousId: original.id, id: place.id }, [place]);
    if (!receipt.ok) { setNotice(receipt.reason); return; }
    setUndo({ oldPlace: original, receipt }); setRequest(null); setReplacementVersion(version => version + 1);
    setNotice(`${original.name} 대신 ${place.name}을 담았어요. 날짜와 순서는 유지했습니다.`);
    onChanged();
  }

  function undoReplacement() {
    if (!undo) return false;
    if (!trip.undoCommand(undo.receipt)) {
      setNotice("교체한 장소를 다시 수정했어요. 새 선택을 보존하기 위해 자동으로 되돌리지 않았습니다.");
      setUndo(null); return false;
    }
    setNotice(`${undo.oldPlace.name}과 이전 체류·휴식 선택을 복원했어요.`); setUndo(null); onChanged();
    return true;
  }

  return { request, original, open, apply, close, undoReplacement, canUndo: Boolean(undo), replacementVersion, notice,
    clear: () => { setRequest(null); setUndo(null); setNotice(""); },
  };
}
