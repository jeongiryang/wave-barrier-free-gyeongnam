import { travelDurationBetween, visitDurationFor, parseClock, formatScheduleTime, buildItinerarySchedule } from '../features/planner/optimization/itinerary-schedule.js';
import { validTripClock } from './trip-time-constraints.js';

export const SPLIT_REUNION_KEY = 'wave-split-reunion-v1';
const minute = (value, min, max) => typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const publicId = value => typeof value === 'string' && /^[1-9]\d{0,11}$/.test(value);
const clock = value => validTripClock(value) ? parseClock(value) : null;
const visit = (input, place) => minute(input.visitMinutesByPlaceId?.[place.id], 15, 720) ? input.visitMinutesByPlaceId[place.id] : visitDurationFor(place);
const rest = (input, place) => minute(input.breakMinutesByPlaceId?.[place.id], 5, 120) ? input.breakMinutesByPlaceId[place.id] : 0;
export function splitDayPlaces(input, day) {
  return input.days.includes(day) ? input.places.filter(place => (input.assignments[place.id] || input.days[0]) === day) : [];
}
export function splitIdentity(input, day) { return day + '|' + splitDayPlaces(input, day).map(place => place.id).sort().join(','); }
function originalDay(input, day) { return buildItinerarySchedule({ places: splitDayPlaces(input, day), days: [day], startTime: input.startTime, origin: input.origin || {}, routeMinutesByPlaceId: input.routeMinutesByPlaceId, visitMinutesByPlaceId: input.visitMinutesByPlaceId, breakMinutesByPlaceId: input.breakMinutesByPlaceId, fixedVisits: input.fixedVisits })[0].entries; }
export function splitSignature(input, day) {
  return JSON.stringify([input.days, input.startTime, day, splitDayPlaces(input, day).map(place => [place.id, place.mapX, place.mapY, visit(input, place), rest(input, place), input.fixedVisits?.[place.id] || null]), input.dayDeadlines?.[day] || null, originalDay(input, day).map(entry => [entry.place.id, entry.endsAt])]);
}
export function defaultSplitChoice(input, day) {
  const places = splitDayPlaces(input, day);
  return { day, startId: places[0]?.id || '', reunionId: places.at(-1)?.id || '', departureTime: '12:00', reunionTime: '16:00', assignments: Object.fromEntries(places.slice(1, -1).map((place, index) => [place.id, index % 2 ? 'B' : 'A'])), waitA: 0, waitB: 0 };
}
export function buildSplitReunion(input, choice) {
  const fail = error => ({ ok: false, error });
  const places = splitDayPlaces(input, choice.day), ids = places.map(place => place.id);
  if (places.length < 3 || places.length > 12 || ids.some(id => !publicId(id)) || new Set(ids).size !== ids.length) return fail('같은 날짜에 담은 공개 장소가 세 곳 이상 필요해요.');
  const startIndex = ids.indexOf(choice.startId), endIndex = ids.indexOf(choice.reunionId);
  if (startIndex < 0 || endIndex < startIndex + 2) return fail('출발 장소와 그 뒤 두 번째 이후의 합류 장소를 골라주세요.');
  const middle = places.slice(startIndex + 1, endIndex), start = places[startIndex], reunion = places[endIndex];
  if (middle.some(place => input.fixedVisits?.[place.id])) return fail('중간에 고정한 장소는 함께 방문해야 해요. 나뉘는 구간을 바꿔주세요.');
  if (!choice.assignments || Object.keys(choice.assignments).length !== middle.length || middle.some(place => !['A', 'B'].includes(choice.assignments[place.id]))) return fail('중간의 모든 장소를 A 또는 B 일정에 한 번씩 나눠주세요.');
  const departure = clock(choice.departureTime), meetAt = clock(choice.reunionTime);
  if (departure === null || meetAt === null || meetAt <= departure || !minute(choice.waitA, 0, 240) || !minute(choice.waitB, 0, 240)) return fail('같은 날의 출발·합류 시각과 출발 전 머무는 시간을 확인해 주세요.');
  const originalEnd = originalDay(input, choice.day).find(entry => entry.place.id === start.id)?.endsAt;
  if (originalEnd !== undefined && departure < originalEnd) return fail(`공통 일정에서 ${start.name}의 방문·휴식은 ${formatScheduleTime(originalEnd)}에 끝나는 계획이에요. 그 이후에 따로 출발해 주세요.`);
  const startFixed = clock(input.fixedVisits?.[start.id]?.time), reunionFixed = clock(input.fixedVisits?.[reunion.id]?.time);
  if (startFixed !== null && departure < startFixed + visit(input, start) + rest(input, start)) return fail('함께 출발할 장소의 고정 시각·체류·휴식이 끝난 뒤 출발해야 해요.');
  if (reunionFixed !== null && meetAt !== reunionFixed) return fail('합류 장소의 고정 시각과 같은 시각으로 정해주세요.');
  const duration = (from, to) => {
    const originalIndex = ids.indexOf(to.id);
    const sameLeg = originalIndex > 0 && ids[originalIndex - 1] === from.id;
    return travelDurationBetween(from, to, { routeMinutes: sameLeg ? input.routeMinutesByPlaceId?.[to.id] : undefined });
  };
  const branches = ['A', 'B'].map(group => {
    let from = start, elapsed = departure + (group === 'A' ? choice.waitA : choice.waitB);
    const entries = [...middle.filter(place => choice.assignments[place.id] === group), reunion].map(place => {
      const travel = duration(from, place), arrivesAt = elapsed + travel.minutes, isReunion = place.id === reunion.id;
      const visitMinutes = isReunion ? 0 : visit(input, place), breakMinutes = isReunion ? 0 : rest(input, place);
      elapsed = arrivesAt + visitMinutes + breakMinutes; from = place;
      return { place, arrivesAt, endsAt: elapsed, travelMinutes: travel.minutes, travelSource: travel.source, visitMinutes, breakMinutes };
    });
    return { group, entries, arrivesAt: elapsed, waitingMinutes: Math.max(0, meetAt - elapsed), lateMinutes: Math.max(0, elapsed - meetAt), estimated: entries.filter(entry => entry.travelSource === 'estimate').length, unknown: entries.filter(entry => entry.travelSource === 'fallback').length };
  });
  let continuationTime = Math.max(meetAt, ...branches.map(branch => branch.arrivesAt)) + visit(input, reunion) + rest(input, reunion), from = reunion;
  const warnings = [], notes = [];
  for (const place of places.slice(endIndex + 1)) {
    const travel = duration(from, place), arrivesAt = continuationTime + travel.minutes, fixed = clock(input.fixedVisits?.[place.id]?.time);
    if (fixed !== null && arrivesAt > fixed) warnings.push(`${place.name} 고정 시각보다 약 ${arrivesAt - fixed}분 늦어져요.`);
    continuationTime = Math.max(arrivesAt, fixed ?? arrivesAt) + visit(input, place) + rest(input, place); from = place;
  }
  const deadline = input.dayDeadlines?.[choice.day];
  if (deadline && clock(deadline.time) !== null) {
    const returnKnown = minute(deadline.returnMinutes, 0, 1440), buffer = minute(deadline.bufferMinutes, 0, 240) ? deadline.bufferMinutes : 0;
    if (continuationTime + (returnKnown ? deadline.returnMinutes : 0) + buffer > clock(deadline.time)) warnings.push(returnKnown ? '합류 뒤 공통 일정과 복귀를 포함하면 정해 둔 귀가 시각을 넘겨요.' : '복귀 이동을 제외한 공통 일정과 여유 시간만으로도 귀가 시각을 넘겨요.');
    if (!returnKnown) notes.push('복귀 이동시간이 미확인이라 귀가 약속에 맞출 수 있는지는 아직 확인하지 못했어요.');
  }
  if (continuationTime >= 1440) warnings.push('합류 뒤 공통 일정이 다음 날로 넘어가요.');
  return { ok: true, day: choice.day, start, reunion, departure, meetAt, branches, continuationTime, warnings, notes, canSave: !branches.some(branch => branch.lateMinutes) && !warnings.length };
}
const isChoice = value => value && typeof value === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(value.day) && publicId(value.startId) && publicId(value.reunionId) && validTripClock(value.departureTime) && validTripClock(value.reunionTime) && minute(value.waitA, 0, 240) && minute(value.waitB, 0, 240) && value.assignments && typeof value.assignments === 'object' && !Array.isArray(value.assignments) && Object.entries(value.assignments).length <= 10 && Object.entries(value.assignments).every(([id, group]) => publicId(id) && ['A', 'B'].includes(group));
const isRecord = row => row && typeof row.identity === 'string' && row.identity.length <= 200 && typeof row.signature === 'string' && row.signature.length <= 12000 && typeof row.savedAt === 'string' && Number.isFinite(Date.parse(row.savedAt)) && isChoice(row.choice);
export function readSplitRecords(storage) {
  const raw = storage.getItem(SPLIT_REUNION_KEY);
  if (raw && raw.length > 250000) throw Error('Invalid split archive');
  const records = JSON.parse(raw || '[]');
  if (!Array.isArray(records) || records.length > 20 || records.some(row => !isRecord(row)) || new Set(records.map(row => row.identity)).size !== records.length) throw Error('Invalid split archive');
  return { raw, records };
}
export function writeSplitRecord(storage, record, expectedRaw) {
  const { raw, records } = readSplitRecords(storage);
  if (raw !== expectedRaw) throw Error('Split archive changed');
  if (!isRecord(record)) throw Error('Invalid split record');
  const next = [record, ...records.filter(row => row.identity !== record.identity)];
  if (next.length > 20) throw Error('Split archive full');
  const serialized = JSON.stringify(next);
  readSplitRecords({ getItem: () => serialized });
  storage.setItem(SPLIT_REUNION_KEY, serialized);
  return readSplitRecords(storage);
}
export function deleteSplitRecord(storage, identity, expectedRaw) {
  const { raw, records } = readSplitRecords(storage);
  if (raw !== expectedRaw) throw Error('Split archive changed');
  storage.setItem(SPLIT_REUNION_KEY, JSON.stringify(records.filter(row => row.identity !== identity)));
  return readSplitRecords(storage);
}
export function splitReunionLines(result, savedAt) {
  if (!result.ok) return [];
  const lines = ['', `따로 걷고 다시 함께 · ${result.day}`, `저장 ${savedAt}`, `${result.start.name}에서 ${formatScheduleTime(result.departure)} 출발 → ${result.reunion.name}에서 ${formatScheduleTime(result.meetAt)} 합류`, '합류 약속의 초안입니다. 거리 추정·미확인 이동과 현장 편의·운영을 출발 전에 함께 확인하세요.'];
  for (const branch of result.branches) {
    lines.push(`${branch.group} 일정`);
    for (const entry of branch.entries) lines.push(`${formatScheduleTime(entry.arrivesAt)} ${entry.place.name} · ${entry.travelSource === 'route' ? '조회한 경로' : entry.travelSource === 'estimate' ? '거리 기반 추정' : '이동 미확인·계산용 참고'} ${entry.travelMinutes}분${entry.visitMinutes ? ` · 체류 ${entry.visitMinutes}분` : ''}${entry.breakMinutes ? ` · 휴식 ${entry.breakMinutes}분` : ''}`);
    lines.push(`합류 ${formatScheduleTime(branch.arrivesAt)} 도착 추정 · ${branch.lateMinutes ? `${branch.lateMinutes}분 늦음` : `${branch.waitingMinutes}분 기다림`}`);
  }
  lines.push(...result.notes, ...result.warnings);
  return lines;
}

export function savedSplitReunionLines(storage, input) {
  const { records } = readSplitRecords(storage), lines = [];
  for (const day of input.days) {
    const record = records.find(row => row.identity === splitIdentity(input, day));
    if (!record) {
      if (records.some(row => row.choice.day === day)) throw Error('합류 약속의 장소가 현재 일정과 달라요. 동행과 합류 계획에서 다시 저장하거나 합류 약속 포함을 끄고 저장해 주세요.');
      continue;
    }
    const result = buildSplitReunion(input, record.choice);
    if (record.signature !== splitSignature(input, day) || record.choice.day !== day || !result.ok || !result.canSave) throw Error('합류 약속의 순서나 시간이 바뀌었어요. 동행과 합류 계획에서 다시 확인하고 저장하거나 합류 약속 포함을 꺼주세요.');
    lines.push(...splitReunionLines(result, record.savedAt));
  }
  if (!lines.length) throw Error('저장한 합류 약속이 없어요. 동행과 합류 계획에서 먼저 저장하거나 합류 약속 포함을 꺼주세요.');
  return lines;
}
