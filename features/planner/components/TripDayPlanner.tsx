"use client";

import { useMemo, useState } from "react";
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
    orderMode, orderNotice, movePlace, movementFor, restoreAutoOrder, toggleSaved,
  } = tripSelection;
  const [editNotice, setEditNotice] = useState("");
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
    <div className="day-order-toolbar"><div><strong>{orderMode === "manual" ? "내가 정한 순서" : "자동 최적화 순서"}</strong><p className="day-planner-explanation">{orderExplanation} 순서·날짜·시작 시각은 이 기기에 저장되고 공유 링크에도 반영됩니다.</p></div>{orderMode === "manual" && <button type="button" onClick={() => { restoreAutoOrder(); setEditNotice(""); }}>자동 순서로 되돌리기</button>}</div>
    <p className="day-order-help">위·아래 버튼은 같은 날짜 안에서만 움직입니다. 첫 장소의 ‘앞으로’와 마지막 장소의 ‘뒤로’는 사용할 수 없습니다.</p>
    <p className="sr-only" role="status" aria-live="polite">{editNotice || orderNotice}</p>
    <div className="day-planner-grid">{schedule.map(({ day, entries }, dayIndex) => <article key={day}>
      <div><small>DAY {String(dayIndex + 1).padStart(2, "0")}</small><strong>{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${day}T12:00:00`))}</strong></div>
      <ol>{entries.map((entry, index) => { const movement = movementFor(entry.place.id); return <li key={entry.place.id}>
        <span>{index + 1}</span>
        <div className="day-place-copy"><b>{entry.startsAtLabel} · {entry.place.name}</b><small>{entry.travelSource === "route" ? "확인된 경로" : entry.travelSource === "estimate" ? "직선거리 기반 추정" : "경로 미확인 · 임시"} 이동 {entry.travelMinutes}분 · 체류 {entry.visitMinutes}분 · {entry.endsAtLabel} 종료</small><small>{entry.place.address || entry.place.city}</small><small className="day-evidence">{typeof entry.place.score === "number" && entry.place.score > 0 ? `공식 편의근거 ${entry.place.score}% · 확인된 항목 ${entry.place.knownFields || 0}개` : "공식 편의근거 확인 필요"}</small>{entry.crossesDateBoundary && <em>일정이 다음 날로 이어집니다.</em>}</div>
        <div className="day-place-editor">
          <select aria-label={`${entry.place.name} 여행 날짜`} value={scheduleAssignments[entry.place.id] || tripDays[0]} onChange={(event) => { assignPlaceToDay(entry.place.id, event.target.value); setEditNotice(`${entry.place.name}을(를) DAY ${tripDays.indexOf(event.target.value) + 1}로 옮겼습니다.`); }}>{tripDays.map((date, dateIndex) => <option key={date} value={date}>DAY {dateIndex + 1}</option>)}</select>
          <div className="day-order-buttons"><button type="button" disabled={!movement.up} aria-label={`${entry.place.name} 같은 날 앞 순서로 이동`} title={movement.up ? "같은 날 앞 장소와 순서를 바꿉니다." : "이 날짜의 첫 장소입니다."} onClick={() => { movePlace(entry.place.id, "up"); setEditNotice(""); }}>↑ 앞</button><button type="button" disabled={!movement.down} aria-label={`${entry.place.name} 같은 날 뒤 순서로 이동`} title={movement.down ? "같은 날 뒤 장소와 순서를 바꿉니다." : "이 날짜의 마지막 장소입니다."} onClick={() => { movePlace(entry.place.id, "down"); setEditNotice(""); }}>↓ 뒤</button><button type="button" className="remove" aria-label={`${entry.place.name} 일정에서 제거`} onClick={() => { toggleSaved(entry.place.id); setEditNotice(`${entry.place.name}을(를) 일정에서 제거했습니다.`); }}>제거</button></div>
        </div>
      </li>; })}</ol>
      {!entries.length && <p>보관한 장소의 날짜를 이 날로 바꿔 추가하세요.</p>}
    </article>)}</div>
  </section>;
}
