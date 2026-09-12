"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveSavedPlaces } from "../../../lib/saved-place-catalog.js";
import { sanitizeTripBreaks, type StopPurpose } from "../../../lib/trip-comfort.js";
import { canMoveVisitDate } from "../../../lib/trip-date-move.js";
import { planVoiceEdit, voiceStateKey, canUndoVoiceEdit, type VoiceState, type VoiceEditReceipt } from "../../../lib/voice-edit.js";
import type { RoutePoint } from "../../routing/types";
import type { Place } from "../types";
import type { TripProgress, TripProgressMemory } from '../../../lib/on-trip.js';
import { useOptimizedTripOrder } from "./useOptimizedTripOrder";
import { useSavedPlaceIds } from "./useSavedPlaceIds";
import { useTripSchedule } from "./useTripSchedule";

export function useTripSelection({ activePlaces, origin, accessibilityProfileCount }: {
  activePlaces: Place[];
  origin: RoutePoint;
  accessibilityProfileCount: number;
}) {
  const { saved, catalog, resetSaved, storageReady: savedStorageReady, addSavedIds, removeSavedId, rememberSavedPlaces, replaceSavedId, restoreSavedPlace } = useSavedPlaceIds();
  const schedule = useTripSchedule();
  const [dayChoice, setActiveDay] = useState("");
  const [progressMemory, setProgressMemory] = useState<TripProgressMemory>({});
  const rememberProgress = useCallback((identity: string, value: TripProgress, unsaved = false) => setProgressMemory(current => Object.fromEntries([[identity, { value, unsaved }], ...Object.entries(current).filter(([key]) => key !== identity).slice(0, 19)])), []);
  const activeDay = schedule.tripDays.includes(dayChoice) ? dayChoice : schedule.tripDays[0];
  const { ensurePlaceAssignment, removePlaceAssignment, canChangePlace } = schedule;
  const savedPlaces = useMemo(
    () => resolveSavedPlaces(saved, activePlaces, catalog),
    [activePlaces, catalog, saved],
  );

  useEffect(() => {
    const selectedActivePlaces = activePlaces.filter((place) => saved.includes(place.id));
    if (selectedActivePlaces.length) rememberSavedPlaces(selectedActivePlaces);
  }, [activePlaces, rememberSavedPlaces, saved]);

  const optimized = useOptimizedTripOrder({
    savedPlaces,
    saved,
    savedStorageReady,
    origin,
    accessibilityProfileCount,
    scheduleAssignments: schedule.scheduleAssignments,
    defaultDay: schedule.tripDays[0] || schedule.travelStart,
    fixedVisits: schedule.fixedVisits,
  });

  const toggleSaved = useCallback((id: string, snapshot?: Place) => {
    if (saved.includes(id)) {
      if (!canChangePlace(id)) return false;
      removePlaceAssignment(id);
      removeSavedId(id);
      return;
    }
    const place = snapshot || activePlaces.find((item) => item.id === id);
    if (!place) return false;
    ensurePlaceAssignment(id);
    addSavedIds([id], [place]);
    return true;
  }, [activePlaces, addSavedIds, ensurePlaceAssignment, removePlaceAssignment, removeSavedId, saved, canChangePlace]);

  // 지도에서 한 번에 담을 때 쓴다. 이미 담긴 곳은 건너뛰고 실제로 더한 수를 돌려준다.
  const savePlaceIds = useCallback((ids: string[]) => {
    const additions = ids.filter((id) => !saved.includes(id) && activePlaces.some((place) => place.id === id));
    additions.forEach(ensurePlaceAssignment);
    addSavedIds(additions, activePlaces);
    return additions.length;
  }, [activePlaces, addSavedIds, ensurePlaceAssignment, saved]);

  const replaceSavedPlace = (previousId: string, place: Place) => {
    if (!saved.includes(previousId) || saved.includes(place.id) || !schedule.canChangePlace(previousId)) return false;
    replaceSavedId(previousId, place);
    schedule.replacePlaceAssignment(previousId, place.id);
    optimized.replacePlaceOrder(previousId, place.id);
    return true;
  };

  const addSuggestedBreaks = (values: Record<string, number>) => {
    for (const [id, minutes] of Object.entries(sanitizeTripBreaks(values, saved))) schedule.setBreakMinutes(id, minutes);
  };

  const canMoveToDate = (id: string, date: string) => canMoveVisitDate({ id, date, order: optimized.orderedPlaceIds,
    assignments: schedule.scheduleAssignments, fixed: schedule.fixedVisits, start: schedule.travelStart, end: schedule.travelEnd });
  const movePlaceToDate = (id: string, date: string) => {
    if (!canMoveToDate(id, date) || !schedule.movePlaceWithPeriod(id, date, saved)) return false;
    optimized.appendPlaceOrder(id); setActiveDay(date); return true;
  };

  const addCourseStop = (afterId: string, place: Place, minutes: number, purpose?: StopPurpose) => {
    if (!/^[1-9]\d{0,11}$/.test(place.id) || !Number.isInteger(minutes) || minutes < 15 || minutes > 720) return false;
    const day = schedule.scheduleAssignments[afterId] || schedule.tripDays[0];
    const sameDay = optimized.orderedSavedPlaces.filter(item => (schedule.scheduleAssignments[item.id] || schedule.tripDays[0]) === day);
    const afterIndex = sameDay.findIndex(item => item.id === afterId);
    if (afterIndex < 0 || !schedule.tripDays.includes(day) || saved.includes(place.id) || saved.length >= 12 || sameDay.slice(afterIndex + 1).some(item => schedule.fixedVisits[item.id])) return false;
    addSavedIds([place.id], [place]);
    schedule.assignPlaceToDay(place.id, day); schedule.setVisitMinutes(place.id, minutes); if (purpose) schedule.setStopPurpose(place.id, purpose);
    optimized.insertPlaceAfter(afterId, place.id);
    return true;
  };
  const addRestStop = (afterId: string, place: Place, minutes: number, purpose: StopPurpose) => addCourseStop(afterId, place, minutes, purpose);

  const resetTrip = (start: string, end: string) => {
    resetSaved(); schedule.resetSchedule(start, end); optimized.resetOrder(); setActiveDay("");
  };

  const voiceState: VoiceState = { saved, order: optimized.orderedPlaceIds, manualOrder: optimized.manualOrderIds, mode: optimized.orderMode, days: schedule.tripDays, activeDay, startTime: schedule.dayStartTime, assignments: schedule.scheduleAssignments, visits: schedule.visitMinutesByPlaceId, breaks: schedule.breakMinutesByPlaceId, purposes: schedule.restPurposeByPlaceId, fixed: schedule.fixedVisits, deadlines: schedule.dayDeadlines, comfort: schedule.comfort };
  const voiceRevision = voiceStateKey(voiceState);
  const applyVoiceEdit = (action: 'add' | 'remove', requested: Place, day: string) => {
    if (!savedStorageReady || !schedule.storageReady || !optimized.orderStorageReady) return { ok: false as const, reason: '저장한 여행을 불러온 뒤 다시 확인해 주세요.' };
    const place = (action === 'add' ? activePlaces : savedPlaces).find(item => item.id === requested.id);
    if (!place) return { ok: false as const, reason: '지금 선택할 수 있는 실제 장소를 다시 확인해 주세요.' };
    const receipt = planVoiceEdit(voiceState, action, place, day);
    if (!receipt.ok) return receipt;
    if (action === 'add') { addSavedIds([place.id], [place]); schedule.assignPlaceToDay(place.id, day); }
    else { schedule.removePlaceAssignment(place.id); removeSavedId(place.id); }
    optimized.restoreOrderSnapshot('manual', receipt.after.order);
    return receipt;
  };
  const undoVoiceEdit = (receipt: VoiceEditReceipt) => {
    if (!canUndoVoiceEdit(voiceState, receipt)) return false;
    const id = receipt.place.id, before = receipt.before;
    if (receipt.action === 'add') { schedule.removePlaceAssignment(id); removeSavedId(id); }
    else restoreSavedPlace(receipt.place, before.saved.indexOf(id));
    if (before.assignments[id]) schedule.assignPlaceToDay(id, before.assignments[id]);
    schedule.setVisitMinutes(id, before.visits[id] ?? null); schedule.setBreakMinutes(id, before.breaks[id] ?? null); schedule.setStopPurpose(id, before.purposes[id] ?? null);
    optimized.restoreOrderSnapshot(before.mode, before.manualOrder);
    return true;
  };

  return {
    voiceRevision, applyVoiceEdit, undoVoiceEdit, progressMemory, rememberProgress,
    rememberSavedPlaces,
    addSuggestedBreaks, addRestStop, addCourseStop,
    canMoveToDate, movePlaceToDate,
    resetTrip,
    saved,
    activeDay,
    setActiveDay,
    savePlaceIds,
    ...schedule,
    ...optimized,
    storageReady: savedStorageReady && schedule.storageReady,
    toggleSaved,
    replaceSavedPlace,
  };
}
