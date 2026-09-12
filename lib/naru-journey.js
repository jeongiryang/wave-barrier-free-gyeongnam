import { directDistanceKm, optimizeVisitOrder } from '../features/planner/optimization/visit-order.js';
import { validTripDate, offsetTripDate } from './trip-dates.js';
import { assessVisitHours } from './visit-hours.js';

/** Deterministic selection from retrieved records, never from model-invented places. */
export function selectJourneyStops({ places, days, profiles = [], indoor = false, indoorById = {}, visitById = {}, relaxed = false, transport = 'transit', existing = [], targetDay, replace = false, anchorId = '' }) {
  if (!Array.isArray(days) || !days.length || days.some(day => !validTripDate(day))) return [];
  const excluded = new Set(existing.map(stop => stop.id));
  const candidates = [...new Map(places.filter(place => typeof place.id === 'string' && /^[1-9]\d{0,11}$/.test(place.id) && directDistanceKm(place, place) !== null
    && !excluded.has(place.id) && !(place.accessibility || []).some(field => field.state === 'negative')
    && (!indoor || indoorById[place.id]?.state === 'indoor-space')).map(place => [place.id, place])).values()];
  candidates.sort((a, b) => Number(b.id === anchorId) - Number(a.id === anchorId)
    || (a.unknownFields || 0) - (b.unknownFields || 0) || (b.knownFields || 0) - (a.knownFields || 0));
  const limit = relaxed ? 2 : 3;
  const maxDistance = transport === 'walk' ? (relaxed ? 1.5 : 3) : transport === 'bicycle' ? 12 : relaxed ? 18 : 35;
  const stops = [];
  const used = new Set();
  const workDays = targetDay ? days.filter(day => day === targetDay) : days;
  for (const day of workDays) {
    const previous = existing.filter(stop => stop.date === day);
    const replacements = replace ? previous.filter(stop => !stop.fixed && (!indoor || indoorById[stop.id]?.state !== 'indoor-space')) : [];
    const count = replace ? replacements.length : Math.max(0, limit - previous.length);
    if (!count) continue;
    const pool = candidates.filter(place => !used.has(place.id) && (place.contentTypeId !== '15' || validTripDate(place.startDate) && validTripDate(place.endDate) && place.startDate <= day && place.endDate >= day)
      && !['closed-day','outside-event'].includes(assessVisitHours(visitById[place.id], { day, startsAt: 720, endsAt: 780 }).reason));
    const clusterSize = point => pool.filter(place => (directDistanceKm(point, place) ?? Infinity) <= maxDistance).length;
    const anchor = previous[0]?.place || pool.find(place => place.id === anchorId) || pool.reduce((best, place) => !best || clusterSize(place) > clusterSize(best) ? place : best, null);
    if (!anchor) continue;
    const nearby = pool.filter(place => (directDistanceKm(anchor, place) ?? Infinity) <= maxDistance).sort((a, b) => Number(b.id === anchorId) - Number(a.id === anchorId) || (directDistanceKm(anchor, a) ?? Infinity) - (directDistanceKm(anchor, b) ?? Infinity));
    const chosen = optimizeVisitOrder(nearby.slice(0, count), { origin: anchor });
    for (let index = 0; index < chosen.length; index++) {
      if (!replace && stops.length + existing.length >= 12) break;
      const place = chosen[index]; used.add(place.id);
      const confirmed = (place.accessibility || []).filter(field => field.state === 'confirmed').map(field => field.label);
      const unknown = (place.accessibility || []).filter(field => field.state === 'unknown').map(field => field.label);
      const reasons = [confirmed.length ? `${confirmed.slice(0, 3).join(' · ')} 정보 확인` : profiles.length ? '편의시설 원문 확인 필요' : '한국관광공사에서 조회한 관광지'];
      if (indoorById[place.id]?.state === 'indoor-space') reasons.push('공식 소개에 실내 공간 기록');
      if (relaxed) reasons.push(replace && count > 2 ? '기존 방문 수를 유지하고 방문 사이 휴식 제안' : '하루 두 곳 이내, 방문 사이 휴식 제안');
      stops.push({ place, date: day, minutes: relaxed ? 60 : place.contentTypeId === '15' ? 120 : 90, breakMinutes: relaxed ? 20 : 10,
        reasons, unknown, ...(replace ? { replaces: replacements[index].id } : {}) });
    }
  }
  return stops;
}

/** A fatigue adjustment reduces optional visits; fixed appointments stay put. */
export function fatigueRemovals(existing, days, targetDay) {
  return days.filter(day => !targetDay || day === targetDay).flatMap(day => {
    const daily = existing.filter(stop => stop.date === day);
    const optional = daily.filter(stop => !stop.fixed);
    const keep = Math.max(0, 2 - daily.filter(stop => stop.fixed).length);
    return optional.slice(keep).filter(stop => stop.place).map(stop => ({ place: stop.place, date: day }));
  });
}

export function journeyDays(start, end) {
  if (!validTripDate(start) || !validTripDate(end) || end < start || end > offsetTripDate(start, 6)) return [];
  return Array.from({ length: 7 }, (_, index) => offsetTripDate(start, index)).filter(day => day <= end);
}

/** A read-only success needs positive evidence for every existing visit. */
export function journeyOutcome({ action, indoor = false, existing = [], indoorById = {}, stops = [], removed = [], restOnly = false, providerFailed = false, conditionsChanged = false }) {
  if (stops.length || removed.length || restOnly) return { kind: 'proposal' };
  if (action === 'adapt-itinerary' && indoor && !providerFailed && !conditionsChanged && existing.length
    && existing.every(stop => typeof stop.id === 'string' && stop.place?.id === stop.id && typeof stop.place.name === 'string' && stop.place.name.trim()
      && validTripDate(stop.date) && indoorById[stop.id]?.state === 'indoor-space')) {
    return { kind: 'unchanged', reason: 'already-indoor', kept: existing.map(stop => ({ id: stop.id, name: stop.place.name, date: stop.date })) };
  }
  return { kind: 'unavailable' };
}

/** Recheck a proposal against current local state before any mutation. */
export function validateJourneyApplication(draft, state) {
  if (draft?.outcome && draft.outcome.kind !== 'proposal') return '변경할 내용이 없는 확인 결과예요. 현재 일정을 유지합니다.';
  if (draft?.removed !== undefined && !Array.isArray(draft.removed) || draft?.restOnly !== undefined && typeof draft.restOnly !== 'boolean') return '변경할 일정안을 다시 확인해 주세요.';
  if (!draft || !Array.isArray(draft.stops) || (!draft.stops.length && !draft.removed?.length && !draft.restOnly) || !journeyDays(draft.start, draft.end).length) return '적용할 일정과 날짜를 확인해 주세요.';
  if (draft.restDay && !journeyDays(draft.start, draft.end).includes(draft.restDay)) return '여행 기간 안의 휴식 날짜를 확인해 주세요.';
  if (draft.restOnly && (!state.saved.length || draft.stops.length)) return '휴식을 반영할 현재 일정을 확인해 주세요.';
  const ids = new Set(), replaced = new Set();
  for (const stop of draft.removed || []) {
    const id = stop?.place?.id;
    if (draft.restDay && stop?.date !== draft.restDay) return '요청한 날짜의 방문만 조정할 수 있어요.';
    if (typeof id !== 'string' || !state.saved.includes(id) || state.fixed[id] || replaced.has(id) || (state.assignments[id] || state.start) !== stop.date) return '제외할 방문의 날짜와 고정 상태가 바뀌었어요. 다시 요청해 주세요.';
    replaced.add(id);
  }
  for (const stop of draft.stops) {
    const id = stop?.place?.id;
    if (typeof id !== 'string' || !/^[1-9]\d{0,11}$/.test(id) || ids.has(id) || state.saved.includes(id)) return '이미 담긴 장소나 중복 장소가 있어요. 다시 제안받아 주세요.';
    if (stop.place.contentTypeId === '15' && (!validTripDate(stop.place.startDate) || !validTripDate(stop.place.endDate) || stop.date < stop.place.startDate || stop.date > stop.place.endDate)) return '축제가 열리는 날짜로 다시 확인해 주세요.';
    if (!journeyDays(draft.start, draft.end).includes(stop.date) || !Number.isInteger(stop.minutes) || stop.minutes < 15 || stop.minutes > 720
      || !Number.isInteger(stop.breakMinutes) || stop.breakMinutes < 0 || stop.breakMinutes > 180) return '방문 날짜와 체류시간이 올바르지 않아요.';
    if (stop.replaces) {
      if (!state.saved.includes(stop.replaces) || state.fixed[stop.replaces] || replaced.has(stop.replaces)
        || (state.assignments[stop.replaces] || state.start) !== stop.date) return '고정 방문이나 변경된 일정을 먼저 확인해 주세요.';
      replaced.add(stop.replaces);
    }
    ids.add(id);
  }
  if (state.saved.length + ids.size - replaced.size > 12) return '한 여행에는 12곳까지 담을 수 있어요.';
  if (state.saved.some(id => { const day = state.assignments[id] || state.start; return day < draft.start || day > draft.end; })) return '기존 방문일을 포함하는 기간으로 다시 제안받아 주세요.';
  return '';
}
