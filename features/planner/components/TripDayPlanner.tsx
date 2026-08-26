"use client";

import { useMemo } from "react";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import { buildItinerarySchedule, routeMinutesForOriginLeg } from "../optimization/itinerary-schedule.js";

export default function TripDayPlanner({ tripSelection, route }: {
  tripSelection: ReturnType<typeof useTripSelection>;
  route: ReturnType<typeof useRoutePlanning>;
}) {
  const {
    scheduleAssignments, tripDays, orderedSavedPlaces, orderExplanation,
    assignPlaceToDay, dayStartTime, setDayStartTime,
  } = tripSelection;
  const routeMinutesByPlaceId = useMemo(() => routeMinutesForOriginLeg({
    places: orderedSavedPlaces,
    days: tripDays,
    assignments: scheduleAssignments,
    destinationId: route.routeDestination?.id,
    routeMinutes: route.activeRoute?.configured ? route.activeRoute.totalTime : undefined,
  }), [orderedSavedPlaces, route.activeRoute, route.routeDestination, scheduleAssignments, tripDays]);
  const schedule = useMemo(() => buildItinerarySchedule({
    places: orderedSavedPlaces,
    days: tripDays,
    assignments: scheduleAssignments,
    startTime: dayStartTime,
    origin: route.origin,
    routeMinutesByPlaceId,
  }), [dayStartTime, orderedSavedPlaces, route.origin, routeMinutesByPlaceId, scheduleAssignments, tripDays]);
  if (!orderedSavedPlaces.length) return null;
  return <section className="day-planner" data-reveal aria-label="날짜별 여행 일정">
    <header><div><span>나의 여행 일정</span><h3>이동과 체류시간을 이어서 계산했어요.</h3></div><div className="day-start-control"><label htmlFor="day-start-time">하루 시작</label><input id="day-start-time" type="time" value={dayStartTime} onChange={(event) => setDayStartTime(event.target.value)} /><small>길찾기를 확인하면 해당 장소의 실제 이동시간이 자동 반영됩니다.</small></div></header>
    <p className="day-planner-explanation">{orderExplanation} 장소 선택은 공유하기 전까지 이 기기에만 저장됩니다.</p>
    <div className="day-planner-grid">{schedule.map(({ day, entries }, dayIndex) => <article key={day}>
      <div><small>DAY {String(dayIndex + 1).padStart(2, "0")}</small><strong>{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${day}T12:00:00`))}</strong></div>
      <ol>{entries.map((entry, index) => <li key={entry.place.id}><span>{index + 1}</span><div><b>{entry.startsAtLabel} · {entry.place.name}</b><small>{entry.travelSource === "route" ? "실제 경로" : entry.travelSource === "estimate" ? "좌표 기준 예상" : "기본 예상"} 이동 {entry.travelMinutes}분 · 체류 {entry.visitMinutes}분 · {entry.endsAtLabel} 종료</small><small>{entry.place.address || entry.place.city}</small>{entry.crossesDateBoundary && <em>일정이 다음 날로 이어집니다.</em>}</div><select aria-label={`${entry.place.name} 여행 날짜`} value={scheduleAssignments[entry.place.id] || tripDays[0]} onChange={(event) => assignPlaceToDay(entry.place.id, event.target.value)}>{tripDays.map((date, dateIndex) => <option key={date} value={date}>DAY {dateIndex + 1}</option>)}</select></li>)}</ol>
      {!entries.length && <p>보관한 장소의 날짜를 이 날로 바꿔 추가하세요.</p>}
    </article>)}</div>
  </section>;
}
