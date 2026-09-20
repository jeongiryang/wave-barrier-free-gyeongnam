import { buildItinerarySchedule } from './optimization/itinerary-schedule.js';
import { dateRange } from './utils';
import type { TravelBookInput } from '../../lib/travel-book.js';
import type { RoutePoint } from '../routing/types';
import { assessVisitHours } from '../../lib/visit-hours.js';
import { cachedVisitInfo } from './services/visit-info';

export type TripTimingInput = TravelBookInput & { origin?: RoutePoint; routeMinutesByPlaceId?: Record<string, number> };

/** Only current local schedule inputs; never fetch or invent opening hours. */
export function tripTimingWarnings(input: TripTimingInput): string[] {
  if (!input.places.length || !input.travelStart || !input.travelEnd) return [];
  const days = dateRange(input.travelStart, input.travelEnd);
  if (!days.length) return [];
  const schedule = buildItinerarySchedule({ places: input.places, days, assignments: input.scheduleAssignments,
    startTime: input.dayStartTime, origin: input.origin, routeMinutesByPlaceId: input.routeMinutesByPlaceId,
    visitMinutesByPlaceId: input.visitMinutesByPlaceId, fixedVisits: input.fixedVisits, breakMinutesByPlaceId: input.breakMinutesByPlaceId });
  const warnings = schedule.flatMap(day => {
    const label = day.day.slice(5).replace('-', '/');
    if (!day.entries.length && days.length > 1) return [`${label}에는 담은 장소가 없어요.`];
    const notices: string[] = [];
    if (day.entries.some(entry => entry.crossesDateBoundary)) notices.push(`${label} 일정이 자정을 넘겨요.`);
    const late = day.entries.filter(entry => entry.lateMinutes > 0);
    if (late.length) notices.push(`${label} 고정 방문 ${late.length}곳에 늦을 수 있어요.`);
    for (const entry of day.entries) {
      const info = cachedVisitInfo(entry.place.id);
      if (!info?.source || info.status !== 'available') continue;
      const check = assessVisitHours(info, { day: day.day, startsAt: entry.startsAt, endsAt: entry.visitEndsAt });
      const reason: Record<string, string> = {
        'before-opening': '개장 전 도착', 'after-closing': '폐장 후 도착',
        'after-admission': '입장 마감 후 도착', 'visit-overrun': '방문 중 운영 종료',
        'closed-day': '등록된 휴무일', 'outside-event': '행사 기간 밖',
      };
      if (check.state === 'conflict' && reason[check.reason]) notices.push(`${label} ${entry.place.name}: ${reason[check.reason]} 예정이에요. 이용 정보와 일정을 확인해 주세요.`);
    }
    return notices;
  });
  if (input.places.some(place => input.scheduleAssignments?.[place.id] && !days.includes(input.scheduleAssignments[place.id]))) warnings.push('여행 기간 밖의 날짜에 배정된 장소가 있어요.');
  return warnings;
}
