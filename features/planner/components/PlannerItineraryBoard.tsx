"use client";
import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from "react";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { useItineraryRoutes } from "../hooks/useItineraryRoutes";
import type { RoutePoint } from "../../routing/types";
import type { Place, WeatherData } from "../types";
import { TripBreakSummary } from "./TripBreakControl";
import { FixedVisitSummary } from "./FixedVisitControl";
import DayDeadlineControl from "./DayDeadlineControl";
import TripComfortPlan from "./TripComfortPlan";
import RestStopFinder from "./RestStopFinder";
import PlaceVisitHours from "./PlaceVisitHours";
import { buildItinerarySchedule } from "../optimization/itinerary-schedule.js";
import PlaceFacilitySummary from "./PlaceFacilitySummary";
import LoadingState from "../../../components/LoadingState";
import { supportedPlacePoint } from "../../../lib/map-coordinates.js";
import { facilityLabel } from "../../../lib/facility-selection.js";
const StopEditor = lazy(() => import('./StopEditor'));
export default function PlannerItineraryBoard({ focusedPlaceId, onFocusPlace, trip, coverage, origin, places, requiredKeys, map, mapView, onSelectPlace, onAlternative }: {
  focusedPlaceId?: string; onFocusPlace: (place: Place) => void;
  trip: ReturnType<typeof useTripSelection>; coverage: ReturnType<typeof useItineraryRoutes>; origin: RoutePoint;
  places: Place[]; requiredKeys: string[]; weather: WeatherData | null; weatherLoading: boolean; region: string;
  map: ReactNode; mapView: boolean; onSelectPlace: (place: Place) => void; onAlternative: (id: string) => void; onContinue: () => void;
}) {
  const schedule = useMemo(() => buildItinerarySchedule({ places: trip.orderedSavedPlaces, days: trip.tripDays, assignments: trip.scheduleAssignments, startTime: trip.dayStartTime, visitMinutesByPlaceId: trip.visitMinutesByPlaceId, fixedVisits: trip.fixedVisits, breakMinutesByPlaceId: trip.breakMinutesByPlaceId, origin, routeMinutesByPlaceId: coverage.routeMinutes }), [trip.orderedSavedPlaces, trip.tripDays, trip.scheduleAssignments, trip.dayStartTime, trip.visitMinutesByPlaceId, trip.fixedVisits, trip.breakMinutesByPlaceId, origin, coverage.routeMinutes]);
  const active = schedule.find(day => day.day === trip.activeDay);
  const [editing, setEditing] = useState<Place | null>(null);
  const [mapMounted, setMapMounted] = useState(mapView);
  if (mapView && !mapMounted) setMapMounted(true);
  const closeEditor = useCallback(() => setEditing(null), []);
  const outside = trip.orderedSavedPlaces.filter(place => trip.scheduleAssignments[place.id] && !trip.tripDays.includes(trip.scheduleAssignments[place.id]));
  const attention = trip.orderedSavedPlaces.map(place => ({
    place,
    items: requiredKeys.flatMap(key => {
      const field = place.accessibility?.find(item => item.key === key);
      return field?.state === "confirmed" ? [] : [`${facilityLabel(key, false)} ${field?.state === "negative" ? "조건과 맞지 않음" : "정보 미확인"}`];
    }),
  })).filter(item => item.items.length > 0);
  return <>
    <div className="simple-itinerary-board" data-map={mapView}>
      <section lang="ko" className="simple-timeboard" aria-label="날짜별 여행 일정">
        {attention.length > 0 && <section className="simple-itinerary-attention" aria-labelledby="itinerary-attention-title">
          <h3 id="itinerary-attention-title">추가 확인이 필요한 장소 {attention.length}곳</h3>
          <p>현재 공식정보에서 확인되지 않았거나 선택한 조건과 맞지 않는 항목이에요</p>
          <ul>{attention.map(({ place, items }) => <li key={place.id}><div><b>{place.name}</b><span>{items.join(" · ")}</span></div><button type="button" onClick={() => onSelectPlace(place)}>이용 정보</button></li>)}</ul>
        </section>}
        <div className="simple-day-tabs" role="group" aria-label="일정 날짜">{trip.tripDays.map((day, index) => <button type="button" key={day} aria-pressed={day === trip.activeDay} onClick={() => trip.setActiveDay(day)}>{index + 1}일차 <span>{day.slice(5).replace('-', '/')}</span></button>)}</div>
        <ol className="simple-stops">{active?.entries.map(entry => {
          const movement = trip.movementFor(entry.place.id);
          return <li key={entry.place.id} id={`itinerary-stop-${entry.place.id}`} data-selected={entry.place.id === focusedPlaceId}>
            <div className="simple-stop"><time>{entry.startsAtLabel}</time><div className="simple-stop-copy"><h3><button type="button" onClick={() => onSelectPlace(entry.place)}>{entry.place.name}</button></h3><p>{entry.visitMinutes}분 머묾 · {entry.visitEndsAtLabel}까지</p><PlaceFacilitySummary place={entry.place} en={false} /></div><button className="simple-edit-stop" type="button" onClick={() => setEditing(entry.place)} aria-label={`${entry.place.name} 일정 수정`}>수정</button></div>
            <div className="simple-stop-details"><TripBreakSummary minutes={entry.breakMinutes} purpose={trip.restPurposeByPlaceId[entry.place.id]} start={entry.visitEndsAtLabel} end={entry.endsAtLabel} /><FixedVisitSummary fixed={trip.fixedVisits[entry.place.id]} waiting={entry.waitingMinutes} late={entry.lateMinutes} /><div className="simple-stop-controls"><button type="button" aria-label={`${entry.place.name} 같은 날 앞 순서로 이동`} disabled={!movement.up} onClick={() => trip.applyTripCommand({ type: 'move', id: entry.place.id, direction: 'up' })}>↑ 앞</button><button type="button" aria-label={`${entry.place.name} 같은 날 뒤 순서로 이동`} disabled={!movement.down} onClick={() => trip.applyTripCommand({ type: 'move', id: entry.place.id, direction: 'down' })}>↓ 뒤</button><button type="button" aria-label={`${entry.place.name} 지도에서 보기`} aria-pressed={entry.place.id === focusedPlaceId} disabled={!supportedPlacePoint(entry.place.mapX, entry.place.mapY)} onClick={() => onFocusPlace(entry.place)}>지도</button><button type="button" aria-label={`${entry.place.name} 비슷한 장소로 교체`} onClick={() => onAlternative(entry.place.id)}>비슷한 장소로 교체</button></div>
              <PlaceVisitHours id={entry.place.id} name={entry.place.name} visit={{ day: active.day, startsAt: entry.startsAt, endsAt: entry.endsAt }} />
              <p className="simple-leg-time">{entry.travelSource === 'route' ? `여기까지 이동 ${entry.travelMinutes}분` : entry.travelSource === 'estimate' ? `여기까지 이동 약 ${entry.travelMinutes}분 · 직선거리 추정` : '여기까지 이동시간 미확인'}{entry.crossesDateBoundary ? ' · 다음 날로 이어짐' : ''}</p>
            </div>
          </li>;
        })}</ol>
        {!active?.entries.length && <p className="simple-empty">이 날짜에 담은 장소가 없어요.</p>}
        {outside.length > 0 && <section className="simple-outside-dates"><h3>기간 밖에 남아 있는 장소</h3>{outside.map(place => <div key={place.id}><span>{place.name} · {trip.scheduleAssignments[place.id]}</span><button type="button" onClick={() => setEditing(place)}>날짜 수정</button></div>)}</section>}
        <details className="simple-day-options"><summary>걷기·휴식·마치는 시각</summary>{trip.activeDay && <DayDeadlineControl key={trip.activeDay} day={trip.activeDay} value={trip.dayDeadlines[trip.activeDay]} entries={active?.entries || []} onChange={value => trip.applyTripCommand({ type: 'deadline', day: trip.activeDay, value })} />}<TripComfortPlan trip={trip} coverage={coverage} schedule={schedule} />{!!active?.entries.length && <div className="travel-book-actions"><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('wave:open-restroom-finder', { detail: { contentId: active.entries.at(-1)?.place.id } }))}>화장실 찾기</button></div>}<RestStopFinder trip={trip} places={places} requiredKeys={requiredKeys} onSelectPlace={onSelectPlace} /></details>
      </section>
      {mapMounted && <div className="simple-itinerary-map" hidden={!mapView}>{map}</div>}
    </div>
    {editing && <Suspense fallback={<LoadingState>일정 수정을 열고 있어요.</LoadingState>}><StopEditor key={editing.id} place={editing} trip={trip} onClose={closeEditor} /></Suspense>}
  </>;
}
