"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { journeyDays, validateJourneyApplication, type NaruJourney } from '../../../lib/naru-journey.js';
import { resolveSavedPlaces, sanitizeSavedPlaceCatalog } from "../../../lib/saved-place-catalog.js";
import { assertTripStorageOwner, replaceCurrentTrip, readTripValue, REGION_KEY, THEMES_KEY, FACILITIES_KEY, GUIDANCE_KEY } from '../../../lib/current-trip-storage.js';
import { resolveFacilityKeys } from '../../../lib/facility-selection.js';
import { sanitizeTripBreaks, type StopPurpose } from "../../../lib/trip-comfort.js";
import { canMoveVisitDate, periodForDate } from "../../../lib/trip-date-move.js";
import { voiceStateKey, type VoiceState, type VoiceEditReceipt } from "../../../lib/voice-edit.js";
import { planTripCommand, type TripCommand, type TripCommandReceipt } from '../../../lib/trip-command.js';
import { ensureTripIdentity } from '../../../lib/trip-identity.js';
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
  const { saved, catalog, resetSaved, restoreSavedSnapshot, storageReady: savedStorageReady, rememberSavedPlaces } = useSavedPlaceIds();
  const [dayChoice, setActiveDay] = useState("");
  const [progressMemory, setProgressMemory] = useState<TripProgressMemory>({});
  const rememberProgress = useCallback((identity: string, value: TripProgress, unsaved = false) => setProgressMemory(current => Object.fromEntries([[identity, { value, unsaved }], ...Object.entries(current).filter(([key]) => key !== identity).slice(0, 19)])), []);
  const activeDay = schedule.tripDays.includes(dayChoice) ? dayChoice : schedule.tripDays[0] || '';
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

  const replaceSavedPlace = (previousId: string, place: Place) => applyTripCommand({ type: 'replace', previousId, id: place.id }, [place]).ok;
  const addSuggestedBreaks = (values: Record<string, number>) => applyTripCommand(Object.entries(sanitizeTripBreaks(values, saved)).filter(([id, minutes]) => schedule.breakMinutesByPlaceId[id] !== minutes).map(([id, minutes]) => ({ type: 'stop', id, breakMinutes: minutes }))).ok;
  const canMoveToDate = (id: string, date: string) => canMoveVisitDate({ id, date, order: optimized.orderedPlaceIds, assignments: schedule.scheduleAssignments, fixed: schedule.fixedVisits, start: schedule.travelStart, end: schedule.travelEnd });
  const movePlaceToDate = (id: string, date: string) => {
    const period = periodForDate(schedule.travelStart, schedule.travelEnd, date);
    if (!period || !canMoveToDate(id, date)) return false;
    const changes: TripCommand[] = [];
    if (period.start !== schedule.travelStart || period.end !== schedule.travelEnd) changes.push({ type: 'schedule', ...period });
    changes.push({ type: 'stop', id, day: date });
    const result = applyTripCommand(changes); if (result.ok) setActiveDay(date); return result.ok;
  };
  const addCourseStop = (afterId: string, place: Place, minutes: number, purpose?: StopPurpose) => {
    const day = schedule.scheduleAssignments[afterId] || schedule.tripDays[0];
    if (!day || !schedule.tripDays.includes(day)) return false;
    return applyTripCommand([{ type: 'add', id: place.id, day, afterId }, { type: 'stop', id: place.id, minutes, ...(purpose ? { purpose } : {}) }], [place]).ok;
  };
  const addRestStop = (afterId: string, place: Place, minutes: number, purpose: StopPurpose) => addCourseStop(afterId, place, minutes, purpose);

  const resetTrip = (start: string, end: string) => {
    resetSaved(); schedule.resetSchedule(start, end); optimized.resetOrder(); setActiveDay("");
  };

  const voiceState: VoiceState = { saved, order: optimized.orderedPlaceIds, manualOrder: optimized.manualOrderIds, mode: optimized.orderMode, travelMode: schedule.travelMode, days: schedule.tripDays, activeDay, startTime: schedule.dayStartTime, assignments: schedule.scheduleAssignments, visits: schedule.visitMinutesByPlaceId, breaks: schedule.breakMinutesByPlaceId, purposes: schedule.restPurposeByPlaceId, fixed: schedule.fixedVisits, deadlines: schedule.dayDeadlines, comfort: schedule.comfort };
  const voiceRevision = voiceStateKey(voiceState);
  const [commandReceipt, setCommandReceipt] = useState<TripCommandReceipt | null>(null);
  const [commandNotice, setCommandNotice] = useState('');
  const commandPlaces = useRef<Place[]>([]);
  const committedRevision = useRef('');
  useEffect(() => { committedRevision.current = ''; }, [voiceRevision]);
  useEffect(() => { if (savedStorageReady && schedule.storageReady) { try { ensureTripIdentity(window.localStorage); } catch { /* Storage notice offers recovery. */ } } }, [savedStorageReady, schedule.storageReady]);
  const journeyUndo = useRef<{ before: VoiceState; places: Place[]; start: string; end: string; after: string; region: string; themes: string } | null>(null);
  const commitJourney = (state: VoiceState, places: Place[], start: string, end: string, region: string, themes: string) => { assertTripStorageOwner(window.localStorage); return replaceCurrentTrip(window.localStorage, {
    [REGION_KEY]: region, [THEMES_KEY]: themes,
    [FACILITIES_KEY]: JSON.stringify(resolveFacilityKeys({ facilityKeys: selectedProfiles })),
    [GUIDANCE_KEY]: readTripValue(window.localStorage, GUIDANCE_KEY) || '{}',
    'wave-saved-places': JSON.stringify(state.saved), 'wave-saved-place-catalog-v1': JSON.stringify(sanitizeSavedPlaceCatalog(places)),
    'wave-trip-order-v1': JSON.stringify({ mode: state.mode, ids: state.manualOrder }),
    'wave-trip-schedule-v1': JSON.stringify({ travelStart: start, travelEnd: end, dayStartTime: state.startTime, travelMode: state.travelMode, scheduleAssignments: state.assignments, visitMinutesByPlaceId: state.visits, breakMinutesByPlaceId: state.breaks, restPurposeByPlaceId: state.purposes, fixedVisits: state.fixed, dayDeadlines: state.deadlines, comfort: state.comfort }),
  }); };
  const restoreVoiceSchedule = (state: VoiceState, start: string, end: string) => schedule.restoreScheduleSnapshot({
    travelStart: start, travelEnd: end, dayStartTime: state.startTime, travelMode: state.travelMode, scheduleAssignments: state.assignments,
    visitMinutesByPlaceId: state.visits, breakMinutesByPlaceId: state.breaks, restPurposeByPlaceId: state.purposes,
    fixedVisits: state.fixed, dayDeadlines: state.deadlines, comfort: state.comfort,
  });
  const applyTripCommand = (command: TripCommand | TripCommand[], candidates: Place[] = activePlaces) => {
    if (!savedStorageReady || !schedule.storageReady || !optimized.orderStorageReady) return { ok: false as const, reason: '저장한 여행을 불러온 뒤 다시 시도해 주세요.' };
    if (committedRevision.current === voiceRevision) return { ok: false as const, reason: '방금 수정한 내용을 적용하고 있어요.' };
    const known = [...optimized.orderedSavedPlaces, ...candidates];
    const commands = Array.isArray(command) ? command : [command];
    if (!commands.length) return { ok: false as const, reason: '변경할 내용이 없어요.' };
    let result = planTripCommand(voiceState, commands[0], known);
    if (!result.ok) { setCommandNotice(result.reason); return result; }
    const first = result;
    for (const item of commands.slice(1)) { result = planTripCommand(result.after, item, known); if (!result.ok) { setCommandNotice(result.reason); return result; } }
    const receipt = { ...result, before: first.before, beforeKey: first.beforeKey, label: commands.length > 1 ? `${commands.length}개의 변경을 적용했어요.` : result.label };
    const after = receipt.after;
    const nextPlaces = after.saved.map(id => known.find(place => place.id === id)).filter((place): place is Place => Boolean(place));
    if (nextPlaces.length !== after.saved.length) return { ok: false as const, reason: '장소 정보를 먼저 불러와 주세요.' };
    try { commitJourney(after, nextPlaces, after.days[0] || '', after.days.at(-1) || '', readTripValue(window.localStorage, REGION_KEY) || '', readTripValue(window.localStorage, THEMES_KEY) || '[]'); }
    catch (error) { const reason = error instanceof Error && error.message.startsWith('다른 탭') ? error.message : '변경 내용을 저장하지 못했어요. 기존 일정은 그대로예요.'; setCommandNotice(reason); return { ok: false as const, reason }; }
    committedRevision.current = voiceRevision;
    commandPlaces.current = known;
    restoreSavedSnapshot(nextPlaces); restoreVoiceSchedule(after, after.days[0] || '', after.days.at(-1) || '');
    optimized.restoreOrderSnapshot(after.mode, after.manualOrder); setActiveDay(after.activeDay);
    setCommandReceipt(receipt); setCommandNotice(receipt.label);
    return receipt;
  };
  const undoCommand = (receipt = commandReceipt) => {
    if (!receipt || receipt.afterKey !== voiceRevision || committedRevision.current === voiceRevision) { setCommandNotice('이후에 수정된 일정이 있어 이전 변경만 되돌릴 수 없어요.'); return false; }
    const before = receipt.before;
    const known = [...optimized.orderedSavedPlaces, ...savedPlaces, ...activePlaces, ...commandPlaces.current];
    const nextPlaces = before.saved.map(id => known.find(place => place.id === id)).filter((place): place is Place => Boolean(place));
    if (nextPlaces.length !== before.saved.length) return false;
    try { commitJourney(before, nextPlaces, before.days[0] || '', before.days.at(-1) || '', readTripValue(window.localStorage, REGION_KEY) || '', readTripValue(window.localStorage, THEMES_KEY) || '[]'); } catch { setCommandNotice('되돌린 내용을 저장하지 못했어요.'); return false; }
    committedRevision.current = voiceRevision;
    restoreSavedSnapshot(nextPlaces); restoreVoiceSchedule(before, before.days[0] || '', before.days.at(-1) || '');
    optimized.restoreOrderSnapshot(before.mode, before.manualOrder); setActiveDay(before.activeDay);
    setCommandReceipt(null); setCommandNotice('변경을 되돌렸어요.'); return true;
  };
  const toggleSaved = (id: string, snapshot?: Place) => applyTripCommand(saved.includes(id) ? { type: 'remove', id } : { type: 'add', id, day: activeDay }, snapshot ? [snapshot] : activePlaces).ok;
  const savePlaceIds = (ids: string[]) => {
    const additions = [...new Set(ids)].filter(id => !saved.includes(id) && activePlaces.some(place => place.id === id));
    return additions.length && applyTripCommand(additions.map(id => ({ type: 'add', id, day: activeDay }))).ok ? additions.length : 0;
  };
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
      const previousVisit = stop.replaces ? voiceState.visits[stop.replaces] : undefined;
      const previousBreak = stop.replaces ? voiceState.breaks[stop.replaces] : undefined;
      const previousPurpose = stop.replaces ? voiceState.purposes[stop.replaces] : undefined;
      if (stop.replaces) { delete after.assignments[stop.replaces]; delete after.visits[stop.replaces]; delete after.breaks[stop.replaces]; delete after.purposes[stop.replaces]; }
      after.assignments[stop.place.id] = stop.date; after.visits[stop.place.id] = previousVisit ?? stop.minutes; after.breaks[stop.place.id] = Math.max(previousBreak ?? 0, stop.breakMinutes);
      if (previousPurpose) after.purposes[stop.place.id] = previousPurpose;
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
    const place = (action === 'add' ? activePlaces : savedPlaces).find(item => item.id === requested.id);
    if (!place) return { ok: false as const, reason: '지금 선택할 수 있는 실제 장소를 다시 확인해 주세요.' };
    const receipt = applyTripCommand(action === 'add' ? { type: 'add', id: place.id, day } : { type: 'remove', id: place.id }, [place]);
    return receipt.ok ? { ...receipt, action, place, day } : receipt;
  };
  const undoVoiceEdit = (receipt: VoiceEditReceipt) => undoCommand({ ...receipt, command: { type: receipt.action, id: receipt.place.id }, label: '' });

  return {
    voiceState, applyTripCommand, undoCommand, commandNotice, canUndoCommand: Boolean(commandReceipt && commandReceipt.afterKey === voiceRevision),
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
    setComfort: (value: Parameters<typeof schedule.setComfort>[0]) => applyTripCommand({ type: 'comfort', value }),
    storageReady: savedStorageReady && schedule.storageReady,
    toggleSaved,
    replaceSavedPlace,
  };
}
