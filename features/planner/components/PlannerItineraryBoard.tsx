"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { useItineraryRoutes } from "../hooks/useItineraryRoutes";
import type { RoutePoint } from "../../routing/types";
import type { Place, WeatherData } from "../types";
import VisitDurationControl from "./VisitDurationControl";
import FixedVisitControl, { FixedVisitSummary } from "./FixedVisitControl";
import DayDeadlineControl from "./DayDeadlineControl";
import { visitDurationFor, buildItinerarySchedule } from "../optimization/itinerary-schedule.js";
import SmartSpotImage from "../../tourism/components/SmartSpotImage";
import PlaceFacilitySummary from "./PlaceFacilitySummary";
import { PlannerWeatherCard } from "./PlannerTripOverview";

export default function PlannerItineraryBoard({ trip, coverage, origin, places, weather, weatherLoading, region, map, mapView, onSelectPlace, onContinue }: {
  trip: ReturnType<typeof useTripSelection>; coverage: ReturnType<typeof useItineraryRoutes>; origin: RoutePoint;
  places: Place[]; weather: WeatherData | null; weatherLoading: boolean; region: string;
  map: ReactNode; mapView: boolean; onSelectPlace: (place: Place) => void; onContinue: () => void;
}) {
  const schedule = useMemo(() => buildItinerarySchedule({ places: trip.orderedSavedPlaces, days: trip.tripDays, assignments: trip.scheduleAssignments, startTime: trip.dayStartTime, visitMinutesByPlaceId: trip.visitMinutesByPlaceId, fixedVisits: trip.fixedVisits, origin, routeMinutesByPlaceId: coverage.routeMinutes }), [trip.orderedSavedPlaces, trip.tripDays, trip.scheduleAssignments, trip.dayStartTime, trip.visitMinutesByPlaceId, trip.fixedVisits, origin, coverage.routeMinutes]);
  const active = schedule.find(day => day.day === trip.activeDay);
  const candidates = places.filter(place => !trip.saved.includes(place.id));
  return <>
    <div className="reference-itinerary-layout" data-map={mapView}>
      <section className="reference-day-list" aria-label="날짜별 여행 일정">
        <div className="reference-day-tabs" role="group" aria-label="일정 날짜">{trip.tripDays.map((day, index) => <button type="button" key={day} aria-pressed={day === trip.activeDay} onClick={() => trip.setActiveDay(day)}>DAY {index + 1} · {day.slice(5).replace("-", "/")}</button>)}</div>
        <label className="reference-start-time">하루 시작 <input type="time" value={trip.dayStartTime} onChange={event => trip.setDayStartTime(event.target.value)} /></label>
        {trip.activeDay && <DayDeadlineControl key={trip.activeDay} day={trip.activeDay} value={trip.dayDeadlines[trip.activeDay]} entries={active?.entries || []} onChange={value => trip.setDayDeadline(trip.activeDay, value)} />}
        {trip.constraintNotice && <p className="modal-note" role="status">{trip.constraintNotice}</p>}
        <ol>{active?.entries.map((entry, index) => {
          const movement = trip.movementFor(entry.place.id);
          return <li key={entry.place.id}><article className="reference-stop">
            <time>{entry.startsAtLabel}</time>
            <SmartSpotImage src={entry.place.image} title={entry.place.name} region={entry.place.city || region} contentId={entry.place.id} tag="" rank={index + 1} showMeta={false} />
            <div className="reference-stop-copy"><button type="button" onClick={() => onSelectPlace(entry.place)}>{entry.place.name}</button><small>{entry.visitSource === "user" ? "체류" : "기본 체류 약"} {entry.visitMinutes}분 · {entry.endsAtLabel}까지</small><PlaceFacilitySummary place={entry.place} en={false} /></div>
            <div className="reference-stop-actions"><button type="button" aria-label={`${entry.place.name} 같은 날 앞 순서로 이동`} disabled={!movement.up} onClick={() => trip.movePlace(entry.place.id, "up")}>↑</button><button type="button" aria-label={`${entry.place.name} 같은 날 뒤 순서로 이동`} disabled={!movement.down} onClick={() => trip.movePlace(entry.place.id, "down")}>↓</button><details><summary aria-label={`${entry.place.name} 일정 수정`}>⋮</summary><div><label>방문 날짜<select disabled={Boolean(trip.fixedVisits[entry.place.id])} aria-label={`${entry.place.name} 여행 날짜`} value={trip.scheduleAssignments[entry.place.id] || trip.tripDays[0]} onChange={event => trip.assignPlaceToDay(entry.place.id, event.target.value)}>{trip.tripDays.map(day => <option key={day} value={day}>{day}</option>)}</select></label><VisitDurationControl name={entry.place.name} value={trip.visitMinutesByPlaceId[entry.place.id]} defaultMinutes={visitDurationFor(entry.place)} onChange={value => trip.setVisitMinutes(entry.place.id, value)} /><FixedVisitControl name={entry.place.name} value={trip.fixedVisits[entry.place.id]} position={index} onChange={value => trip.setFixedVisit(entry.place.id, value)} /><button type="button" disabled={Boolean(trip.fixedVisits[entry.place.id])} onClick={() => trip.toggleSaved(entry.place.id)}>일정에서 제거</button></div></details></div>
          </article><FixedVisitSummary fixed={trip.fixedVisits[entry.place.id]} waiting={entry.waitingMinutes} late={entry.lateMinutes} /><p className="reference-leg-time">{entry.travelSource === "route" ? `확인된 이동 ${entry.travelMinutes}분` : entry.travelSource === "estimate" ? `직선거리 기반 추정 ${entry.travelMinutes}분` : "이동 경로 미확인"}{entry.crossesDateBoundary ? " · 다음 날로 이어져요" : ""}</p></li>;
        })}</ol>
        {!active?.entries.length && <p>추가할 여행지를 고르거나 다른 날짜의 장소를 옮겨보세요.</p>}
      </section>
      {mapView && <div className="reference-board-map">{map}</div>}
      <aside className="reference-itinerary-aside">{mapView ? <><h3>여행 정보</h3><PlannerWeatherCard weather={weather} loading={weatherLoading} region={region} /><div className="reference-tint"><strong>이동</strong><p>{coverage.readyCount} / {coverage.legs.length}구간 확인</p></div></> : <><h3>추가할 여행지</h3><p>현재 검색 조건에 맞는 장소</p>{candidates.slice(0, 4).map((place, index) => <article className="reference-add-place" key={place.id}><SmartSpotImage src={place.image} title={place.name} region={place.city || region} contentId={place.id} tag="" rank={index + 1} showMeta={false} /><div><button type="button" onClick={() => onSelectPlace(place)}>{place.name}</button><small>{place.city}</small></div><button className="reference-primary" type="button" aria-label={`${place.name} 일정에 추가`} onClick={() => { trip.toggleSaved(place.id, place); trip.assignPlaceToDay(place.id, trip.activeDay); }}>+ 추가</button></article>)}{!candidates.length && <p>검색한 여행지를 모두 일정에 담았어요.</p>}<div className="reference-tint"><strong>일정 편집 방법</strong><p>하루 시작 시간을 바꾸면 시간표가 함께 바뀝니다.</p><p>위·아래 버튼으로 순서를 바꾸고, 더보기에서 방문 날짜와 머무는 시간을 정하세요.</p></div></>}</aside>
    </div>
    <div className="reference-bottom-bar"><div><strong>DAY {trip.tripDays.indexOf(trip.activeDay) + 1} · {active?.entries.length || 0}곳</strong><small>미확인 이동 시간은 실제 경로 조회 후 확인해 주세요.</small></div><button type="button" onClick={onContinue}>다음: 전체보기</button></div>
  </>;
}
