import { directDistanceKm, optimizeVisitOrder } from '../features/planner/optimization/visit-order.js';
import { validTripClock } from './trip-time-constraints.js';
import { validVisitMinutes } from './visit-durations.js';
import { visitDurationFor } from '../features/planner/optimization/itinerary-schedule.js';

function routeDistance(places, days, assignments, origin) {
  // Never report a partial sum as the whole trip, even for an isolated stop.
  if (places.some(place => directDistanceKm(place, place) === null || !days.includes(assignments[place.id] || days[0]))) return null;
  const originIncluded = origin != null && Object.values(origin).some(value => value !== '' && value != null);
  if (originIncluded && directDistanceKm(origin, origin) === null) return null;
  let totalKm = 0, longestLegKm = 0;
  for (const day of days) {
    let previous = originIncluded ? origin : null;
    for (const place of places.filter(item => (assignments[item.id] || days[0]) === day)) {
      if (previous) {
        const distance = directDistanceKm(previous, place);
        totalKm += distance;
        longestLegKm = Math.max(longestLegKm, distance);
      }
      previous = place;
    }
  }
  return { totalKm, longestLegKm, originIncluded };
}

function proposalWarnings(order, changes, days, fixed, startTime) {
  const warnings = [];
  const clockMinutes = clock => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
  for (const day of days) {
    const stops = order.map(id => changes.find(change => change.id === id)).filter(change => change.date === day);
    if (!stops.length) {
      warnings.push(`${day.slice(5)}에는 방문 장소가 없어요.`);
      continue;
    }
    if (!validTripClock(startTime)) continue;
    let elapsed = clockMinutes(startTime);
    // A lower bound only: no invented travel time or unverified opening hours.
    for (const stop of stops) {
      const appointment = fixed[stop.id]?.time;
      if (validTripClock(appointment)) elapsed = Math.max(elapsed, clockMinutes(appointment));
      elapsed += stop.minutes + stop.breakAfter;
    }
    if (elapsed >= 24 * 60) warnings.push(`${day.slice(5)} 일정은 이동시간을 제외한 체류·휴식과 고정 방문 시각만으로도 자정을 넘어요.`);
  }
  return warnings;
}

/** A local, reviewable proposal: preserve every venue, visit duration and fixed appointment. */
export function gentleTripPlan({places, days, assignments, fixed = {}, breaks = {}, visits = {}, origin, targetDay, startTime}) {
  const next = Object.fromEntries(places.map(place=>[place.id, assignments[place.id] || days[0]]));
  const count = day=>places.filter(place=>next[place.id]===day).length;
  const allowed = (place, day)=>place.contentTypeId!=='15' || Boolean(place.startDate && place.endDate && day>=place.startDate && day<=place.endDate);
  // Spread only a visibly overloaded day; explicit one-day requests stay on that day.
  if (!targetDay && days.length>1) for(let iteration=0;iteration<places.length;iteration++) {
    const orderedDays=[...days].sort((a,b)=>count(a)-count(b));
    const light=orderedDays[0], heavy=orderedDays.at(-1);
    if(count(heavy)-count(light)<2) break;
    const candidate=[...places].reverse().find(place=>next[place.id]===heavy && !fixed[place.id] && allowed(place,light));
    if(!candidate) break;
    next[candidate.id]=light;
  }
  const order=places.map(place=>place.id);
  for(const day of days) {
    if(targetDay && day!==targetDay) continue;
    const positions=places.flatMap((place,index)=>next[place.id]===day && !fixed[place.id] ? [index] : []);
    // Keep fixed visits at the same positions. Only reorder spans between them.
    let segment=[];
    const apply=()=>{ const sorted=optimizeVisitOrder(segment.map(index=>places[index]),{origin}); segment.forEach((index,slot)=>{order[index]=sorted[slot].id;});segment=[]; };
    for(let index=0;index<places.length;index++) {
      if(fixed[places[index].id]) apply();
      else if(positions.includes(index)) segment.push(index);
    }
    apply();
  }
  const changes = places.map(place=>({id:place.id,name:place.name,fromDate:assignments[place.id] || days[0],date:next[place.id],minutes:validVisitMinutes(visits[place.id]) ? visits[place.id] : visitDurationFor(place),breakBefore:breaks[place.id] || 0,breakAfter:targetDay && next[place.id]!==targetDay ? breaks[place.id] || 0 : Math.max(20,breaks[place.id] || 0)}));
  return {order, assignments:next, changes,
    distance: {before: routeDistance(places, days, assignments, origin), after: routeDistance(order.map(id => places.find(place => place.id === id)), days, next, origin)},
    warnings: proposalWarnings(order, changes, days, fixed, startTime),
    basis:'장소 좌표의 직선거리와 날짜별 방문 수로 제안했어요. 실제 이동시간·통행 편의는 경로 조회 후 확인합니다.'};
}
