"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { journeyDays, validateJourneyApplication, type NaruJourney } from '../../../lib/naru-journey.js';
import { resolveSavedPlaces, sanitizeSavedPlaceCatalog } from "../../../lib/saved-place-catalog.js";
import { replaceCurrentTrip, readTripValue, REGION_KEY, THEMES_KEY } from '../../../lib/current-trip-storage.js';
import { sanitizeTripBreaks, type StopPurpose } from "../../../lib/trip-comfort.js";
import { canMoveVisitDate } from "../../../lib/trip-date-move.js";
import { planVoiceEdit, voiceStateKey, canUndoVoiceEdit, type VoiceState, type VoiceEditReceipt } from "../../../lib/voice-edit.js";
import type { RoutePoint } from "../../routing/types";
import type { Place } from "../types";
import type { TripProgress, TripProgressMemory } from '../../../lib/on-trip.js';
import { useOptimizedTripOrder } from "./useOptimizedTripOrder";
import { useSavedPlaceIds } from "./useSavedPlaceIds";
import type { useTripSchedule } from "./useTripSchedule";
import { useSavedPlaceEvidence } from './useSavedPlaceEvidence';

export function useTripSelection({ schedule, activePlaces, origin, accessibilityProfileCount, selectedProfiles = [] }: {
  schedule: ReturnType<typeof useTripSchedule>;
  selectedProfiles?: string[];
  activePlaces: Place[];
  origin: RoutePoint;
  accessibilityProfileCount: number;
}) {
  const { saved, catalog, resetSaved, restoreSavedSnapshot, storageReady: savedStorageReady, addSavedIds, removeSavedId, rememberSavedPlaces, replaceSavedId, restoreSavedPlace } = useSavedPlaceIds();
  const [dayChoice, setActiveDay] = useState("");
  const [progressMemory, setProgressMemory] = useState<TripProgressMemory>({});
  const rememberProgress = useCallback((identity: string, value: TripProgress, unsaved = false) => setProgressMemory(current => Object.fromEntries([[identity, { value, unsaved }], ...Object.entries(current).filter(([key]) => key !== identity).slice(0, 19)])), []);
  const activeDay = schedule.tripDays.includes(dayChoice) ? dayChoice : schedule.tripDays[0];
  const { ensurePlaceAssignment, removePlaceAssignment, canChangePlace } = schedule;
  const savedEvidence = useSavedPlaceEvidence(saved, selectedProfiles, savedStorageReady);
  const savedPlaces = useMemo(
    () => resolveSavedPlaces(saved, [...activePlaces, ...savedEvidence.places], catalog),
    [activePlaces, catalog, saved, savedEvidence.places],
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

  const voiceState: VoiceState = { saved, order: optimized.orderedPlaceIds, manualOrder: optimized.manualOrderIds, mode: optimized.orderMode, travelMode: schedule.travelMode, days: schedule.tripDays, activeDay, startTime: schedule.dayStartTime, assignments: schedule.scheduleAssignments, visits: schedule.visitMinutesByPlaceId, breaks: schedule.breakMinutesByPlaceId, purposes: schedule.restPurposeByPlaceId, fixed: schedule.fixedVisits, deadlines: schedule.dayDeadlines, comfort: schedule.comfort };
  const voiceRevision = voiceStateKey(voiceState);
  const journeyUndo = useRef<{ before: VoiceState; places: Place[]; start: string; end: string; after: string; region: string; themes: string } | null>(null);
  const commitJourney = (state: VoiceState, places: Place[], start: string, end: string, region: string, themes: string) => replaceCurrentTrip(window.localStorage, {
    [REGION_KEY]: region, [THEMES_KEY]: themes,
    'wave-saved-places': JSON.stringify(state.saved), 'wave-saved-place-catalog-v1': JSON.stringify(sanitizeSavedPlaceCatalog(places)),
    'wave-trip-order-v1': JSON.stringify({ mode: state.mode, ids: state.manualOrder }),
    'wave-trip-schedule-v1': JSON.stringify({ travelStart: start, travelEnd: end, dayStartTime: state.startTime, travelMode: state.travelMode, scheduleAssignments: state.assignments, visitMinutesByPlaceId: state.visits, breakMinutesByPlaceId: state.breaks, restPurposeByPlaceId: state.purposes, fixedVisits: state.fixed, dayDeadlines: state.deadlines, comfort: state.comfort }),
  });
  const restoreVoiceSchedule = (state: VoiceState, start: string, end: string) => schedule.restoreScheduleSnapshot({
    travelStart: start, travelEnd: end, dayStartTime: state.startTime, travelMode: state.travelMode, scheduleAssignments: state.assignments,
    visitMinutesByPlaceId: state.visits, breakMinutesByPlaceId: state.breaks, restPurposeByPlaceId: state.purposes,
    fixedVisits: state.fixed, dayDeadlines: state.deadlines, comfort: state.comfort,
  });
  const applyJourneyDraft = (draft: NaruJourney) => {
    if (!savedStorageReady || !schedule.storageReady || !optimized.orderStorageReady) return '저장한 여행을 불러온 뒤 다시 시도해 주세요.';
    if (saved.some(id => !optimized.orderedSavedPlaces.some(place => place.id === id))) return '기존 일정에 아직 불러오지 못한 장소가 있어요. 장소 정보를 먼저 확인해 주세요. 기존 일정은 그대로 유지합니다.';
    const error = validateJourneyApplication(draft, { saved, fixed: schedule.fixedVisits, assignments: schedule.scheduleAssignments, start: schedule.travelStart });
    if (error) return error;
    const replacements = new Map(draft.stops.filter(stop => stop.replaces).map(stop => [stop.replaces!, stop]));
    const removed = new Set(draft.removed?.map(stop => stop.place.id) || []);
    const nextPlaces = [...optimized.orderedSavedPlaces.filter(place => !removed.has(place.id)).map(place => replacements.get(place.id)?.place || place), ...draft.stops.filter(stop => !stop.replaces).map(stop => stop.place)];
    const nextIds = nextPlaces.map(place => place.id);
    const after: VoiceState = { ...voiceState, saved: nextIds, order: nextIds, manualOrder: nextIds, mode: 'manual', travelMode: draft.transport, days: journeyDays(draft.start, draft.end), activeDay: draft.stops[0]?.date || draft.restDay || activeDay,
      assignments: { ...voiceState.assignments, ...Object.fromEntries(saved.map(id => [id, voiceState.assignments[id] || schedule.travelStart])) }, visits: { ...voiceState.visits }, breaks: { ...voiceState.breaks }, purposes: { ...voiceState.purposes },
      comfort: draft.relaxed ? { ...voiceState.comfort, maxWalkMinutes: voiceState.comfort.maxWalkMinutes ?? 15, breakEveryMinutes: voiceState.comfort.breakEveryMinutes ?? 60, breakMinutes: Math.max(20, voiceState.comfort.breakMinutes || 0) } : voiceState.comfort };
    for (const stop of draft.stops) {
      if (stop.replaces) { delete after.assignments[stop.replaces]; delete after.visits[stop.replaces]; delete after.breaks[stop.replaces]; delete after.purposes[stop.replaces]; }
      after.assignments[stop.place.id] = stop.date; after.visits[stop.place.id] = stop.minutes; after.breaks[stop.place.id] = stop.breakMinutes;
    }
    for (const id of removed) { delete after.assignments[id]; delete after.visits[id]; delete after.breaks[id]; delete after.purposes[id]; }
    if (draft.restOnly) for (const id of nextIds) if (!draft.restDay || after.assignments[id] === draft.restDay) after.breaks[id] = Math.max(20, after.breaks[id] || 0);
    let previousRegion = '', previousThemes = '[]';
    try {
      previousRegion = readTripValue(window.localStorage, REGION_KEY) || ''; previousThemes = readTripValue(window.localStorage, THEMES_KEY) || '[]';
      commitJourney(after, nextPlaces, draft.start, draft.end, draft.region, JSON.stringify(draft.themes));
    } catch { return '이 일정안을 기기에 저장하지 못했어요. 기존 일정은 그대로입니다. 저장 공간을 확인한 뒤 다시 적용해 주세요.'; }
    journeyUndo.current = { before: voiceState, places: optimized.orderedSavedPlaces, start: schedule.travelStart, end: schedule.travelEnd, after: voiceStateKey(after), region: previousRegion, themes: previousThemes };
    restoreSavedSnapshot(nextPlaces); restoreVoiceSchedule(after, draft.start, draft.end);
    optimized.restoreOrderSnapshot('manual', nextIds); setActiveDay(after.activeDay);
    return '';
  };
  const undoJourneyDraft = () => {
    const snapshot = journeyUndo.current;
    if (!snapshot || snapshot.after !== voiceRevision) return false;
    try { commitJourney(snapshot.before, snapshot.places, snapshot.start, snapshot.end, snapshot.region, snapshot.themes); } catch { return false; }
    restoreSavedSnapshot(snapshot.places); restoreVoiceSchedule(snapshot.before, snapshot.start, snapshot.end);
    optimized.restoreOrderSnapshot(snapshot.before.mode, snapshot.before.manualOrder); setActiveDay(snapshot.before.activeDay); journeyUndo.current = null;
    return true;
  };
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
    savedEvidence, voiceRevision, applyVoiceEdit, undoVoiceEdit, applyJourneyDraft, undoJourneyDraft, progressMemory, rememberProgress,
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
