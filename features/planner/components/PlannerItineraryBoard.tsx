"use client";
import NightIcon from '../../../components/NightIcon';

import ActionIcon from '../../../components/ActionIcon';
import { PlannerToolPortal } from "./PlannerToolSurface";
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
import SmartSpotImage from "../../tourism/components/SmartSpotImage";
import LoadingState from "../../../components/LoadingState";
import { supportedPlacePoint } from "../../../lib/map-coordinates.js";
import { facilityLabel } from "../../../lib/facility-selection.js";
import { useOpenNaru } from "../../../components/NaruContext";
const StopEditor = lazy(() => import('./StopEditor'));
export default function PlannerItineraryBoard({ focusedPlaceId, onFocusPlace, trip, coverage, origin, places, requiredKeys, map, mapView, onSelectPlace, onAlternative }: {
  focusedPlaceId?: string; onFocusPlace: (place: Place) => void;
  trip: ReturnType<typeof useTripSelection>; coverage: ReturnType<typeof useItineraryRoutes>; origin: RoutePoint;
  places: Place[]; requiredKeys: string[]; weather: WeatherData | null; weatherLoading: boolean; region: string;
  map: ReactNode; mapView: boolean; onSelectPlace: (place: Place) => void; onAlternative: (id: string) => void; onContinue: () => void;
}) {
  const openNaru = useOpenNaru();
  const schedule = useMemo(() => buildItinerarySchedule({ places: trip.orderedSavedPlaces, days: trip.tripDays, assignments: trip.scheduleAssignments, startTime: trip.dayStartTime, visitMinutesByPlaceId: trip.visitMinutesByPlaceId, fixedVisits: trip.fixedVisits, breakMinutesByPlaceId: trip.breakMinutesByPlaceId, origin, routeMinutesByPlaceId: coverage.routeMinutes }), [trip.orderedSavedPlaces, trip.tripDays, trip.scheduleAssignments, trip.dayStartTime, trip.visitMinutesByPlaceId, trip.fixedVisits, trip.breakMinutesByPlaceId, origin, coverage.routeMinutes]);
  const active = schedule.find(day => day.day === trip.activeDay);
  const [editing, setEditing] = useState<Place | null>(null);
  const [memoOpen, setMemoOpen] = useState(false);
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [mapMounted, setMapMounted] = useState(mapView);
  if (mapView && !mapMounted) setMapMounted(true);
  const closeEditor = useCallback(() => setEditing(null), [setEditing]);
  function selectStop(place: Place) {
    // The wide layout moves row details into the focused center column.
    // Read the breakpoint at activation so a resized view keeps its own action.
    if (window.matchMedia('(min-width:900px)').matches) onFocusPlace(place);
    else onSelectPlace(place);
  }
  const outside = trip.orderedSavedPlaces.filter(place => trip.scheduleAssignments[place.id] && !trip.tripDays.includes(trip.scheduleAssignments[place.id]));
  const timingWarnings = schedule.flatMap(day => {
    const label = day.day.slice(5).replace('-', '/');
    if (!day.entries.length && trip.orderedSavedPlaces.length && schedule.length > 1) return [`${label}에는 담은 장소가 없어요`];
    const notices: string[] = [];
    if (day.entries.some(entry => entry.crossesDateBoundary)) notices.push(`${label} 일정이 자정을 넘겨요`);
    const late = day.entries.filter(entry => entry.lateMinutes > 0);
    if (late.length) notices.push(`${label} 고정 방문 ${late.length}곳에 늦을 수 있어요`);
    return notices;
  });
  const attention = trip.orderedSavedPlaces.map(place => ({
    place,
    items: requiredKeys.flatMap(key => {
      const field = place.accessibility?.find(item => item.key === key);
      return field?.state === "confirmed" ? [] : [`${facilityLabel(key, false)} ${field?.state === "negative" ? "조건과 맞지 않음" : "정보 미확인"}`];
    }),
  })).filter(item => item.items.length > 0);
  const focusedEntry = active?.entries.find(entry => entry.place.id === focusedPlaceId) || active?.entries[0];
  const focusedMovement = focusedEntry ? trip.movementFor(focusedEntry.place.id) : null;
  const travelTotal = active?.entries.reduce((total, entry) => total + entry.travelMinutes, 0) || 0;
  const visitTotal = active?.entries.reduce((total, entry) => total + entry.visitMinutes + entry.breakMinutes, 0) || 0;
  const nearbyPlaces = focusedEntry ? places.filter(place => place.id !== focusedEntry.place.id && place.city === focusedEntry.place.city).slice(0, 2) : [];
  const relatedPlaces: Place[] = nearbyPlaces.length ? nearbyPlaces : (active?.entries.filter(entry => entry.place.id !== focusedEntry?.place.id).slice(0, 2).map(entry => entry.place) || []);
  return <>
    <div className="simple-itinerary-board itinerary-reference" data-map={mapView}>
      <section lang="ko" className="simple-timeboard" aria-label="날짜별 여행 일정">
        {!!timingWarnings.length && <section className="simple-itinerary-attention" aria-labelledby="itinerary-timing-title">
          <h3 id="itinerary-timing-title">시간과 날짜를 한 번 더 확인해 주세요</h3>
          <ul>{timingWarnings.map(message => <li key={message}>{message}</li>)}</ul>
          <p>현재 이동·체류·휴식 시간을 합산한 결과예요. 조회되지 않은 이동시간은 추정값입니다.</p>
          <button type="button" onClick={() => openNaru('현재 담은 장소와 고정 방문을 모두 유지하면서 날짜별 방문을 분산하고 이동 부담을 줄여줘')}>나루와 일정 조정하기</button>
        </section>}
        {attention.length > 0 && <section className="simple-itinerary-attention" aria-labelledby="itinerary-attention-title">
          <h3 id="itinerary-attention-title">추가 확인이 필요한 장소 {attention.length}곳</h3>
          <p>현재 공식정보에서 확인되지 않았거나 선택한 조건과 맞지 않는 항목이에요</p>
          <ul>{attention.map(({ place, items }) => <li key={place.id}><div><b>{place.name}</b><span>{items.join(" · ")}</span></div><button type="button" onClick={() => onSelectPlace(place)} data-icon-action="" title="이용 정보"><NightIcon name="info" size={20}/><span className="sr-only">이용 정보</span></button></li>)}</ul>
        </section>}
        <div className="simple-day-tabs" role="group" aria-label="일정 날짜">{trip.tripDays.map((day, index) => <button type="button" key={day} aria-pressed={day === trip.activeDay} onClick={() => trip.setActiveDay(day)}>{index + 1}일차 <span>{day.slice(5).replace('-', '/')}</span></button>)}</div>
        <ol className="simple-stops">{active?.entries.map((entry, index) => {
          const movement = trip.movementFor(entry.place.id);
          return <li key={entry.place.id} id={`itinerary-stop-${entry.place.id}`} data-selected={entry.place.id === focusedPlaceId}>
            <span className="reference-stop-number" aria-hidden="true">{index + 1}</span>
            <div className="simple-stop"><time>{entry.startsAtLabel}</time><div className="simple-stop-card"><div className="night-stop-photo"><SmartSpotImage src={entry.place.image} title={entry.place.name} region={entry.place.city} contentId={entry.place.id} tag="관광" rank={0} showMeta={false} compact /></div><div className="simple-stop-copy"><div className="simple-stop-title"><h3><button type="button" onClick={() => selectStop(entry.place)}>{entry.place.name}</button></h3><button className="simple-edit-stop" type="button" onClick={() => setEditing(entry.place)} aria-label={`${entry.place.name} 일정 수정`} title="수정"><ActionIcon label="수정" /></button></div><p>{entry.visitMinutes}분 머물러요 · {entry.visitEndsAtLabel}까지</p><PlaceFacilitySummary place={entry.place} en={false} /></div><div className="simple-stop-details"><TripBreakSummary minutes={entry.breakMinutes} purpose={trip.restPurposeByPlaceId[entry.place.id]} start={entry.visitEndsAtLabel} end={entry.endsAtLabel} /><FixedVisitSummary fixed={trip.fixedVisits[entry.place.id]} waiting={entry.waitingMinutes} late={entry.lateMinutes} /><div className="simple-stop-controls"><button type="button" aria-label={`${entry.place.name} 같은 날 앞 순서로 이동`} disabled={!movement.up} onClick={() => trip.applyTripCommand({ type: 'move', id: entry.place.id, direction: 'up' })} data-icon-action="" title="앞"><NightIcon name="up" size={20}/><span className="sr-only">앞</span></button><button type="button" aria-label={`${entry.place.name} 같은 날 뒤 순서로 이동`} disabled={!movement.down} onClick={() => trip.applyTripCommand({ type: 'move', id: entry.place.id, direction: 'down' })} data-icon-action="" title="뒤"><NightIcon name="down" size={20}/><span className="sr-only">뒤</span></button><button type="button" aria-label={`${entry.place.name} 지도에서 보기`} aria-pressed={entry.place.id === focusedPlaceId} disabled={!supportedPlacePoint(entry.place.mapX, entry.place.mapY)} onClick={() => onFocusPlace(entry.place)} data-icon-action="" title="지도"><NightIcon name="map" size={20}/><span className="sr-only">지도</span></button><button type="button" aria-label={`${entry.place.name} 비슷한 장소로 교체`} onClick={() => onAlternative(entry.place.id)} data-icon-action="" title="비슷한 장소로 교체"><NightIcon name="route"/></button></div><PlaceVisitHours id={entry.place.id} name={entry.place.name} visit={{ day: active.day, startsAt: entry.startsAt, endsAt: entry.endsAt }} /><p className="simple-leg-time">{entry.travelSource === 'route' ? `여기까지 이동 ${entry.travelMinutes}분` : entry.travelSource === 'estimate' ? `여기까지 이동 약 ${entry.travelMinutes}분 · 직선거리 추정` : '여기까지 이동시간 미확인'}{entry.crossesDateBoundary ? ' · 다음 날로 이어짐' : ''}</p></div></div></div>
          </li>;
        })}</ol>
        {!active?.entries.length && <p className="simple-empty">이 날짜에 담은 장소가 없어요.</p>}
        {!!active?.entries.length && <section className="reference-trip-summary" aria-label="일정 요약">
          <h3><NightIcon name="pin" size={20}/>일정 요약</h3>
          <div className="reference-trip-metrics"><span><NightIcon name="map"/><b>총 {active.entries.length}개 장소</b></span><span><NightIcon name="car"/><b>이동 약 {travelTotal}분</b></span><span><NightIcon name="clock"/><b>머묾 {visitTotal}분</b></span></div>
          <p className="reference-estimate-note">{focusedEntry?.place.source?.includes('로컬 화면 시연') ? '로컬 디자인 시연 · 사진은 배포 화면의 관광사진이며, 위치와 일정 시간은 예시입니다.' : '조회되지 않은 이동시간은 직선거리 추정입니다.'}</p>
          <ol className="reference-day-progress">{active.entries.map((entry, index) => <li key={entry.place.id}><button type="button" aria-label={`${index + 1}번째 ${entry.place.name} 선택`} aria-pressed={entry.place.id === focusedEntry?.place.id} onClick={() => onFocusPlace(entry.place)}>{index + 1}</button><time>{entry.startsAtLabel}</time></li>)}</ol>
          <button type="button" className="reference-companion-note" onClick={() => openNaru('현재 일정의 장소와 필요한 편의를 유지하며 동행자의 속도에 맞게 휴식과 이동 부담을 조정하고 싶어요')}><NightIcon name="people"/><span>동행의 속도에 맞춰 여행을 조정해요.</span><NightIcon name="edit" size={18}/></button>
        </section>}
        {outside.length > 0 && <section className="simple-outside-dates"><h3>기간 밖에 남아 있는 장소</h3>{outside.map(place => <div key={place.id}><span>{place.name} · {trip.scheduleAssignments[place.id]}</span><button type="button" onClick={() => setEditing(place)} data-icon-action="" title="날짜 수정"><NightIcon name="calendar" size={20}/><span className="sr-only">날짜 수정</span></button></div>)}</section>}
        <PlannerToolPortal group="comfort"><details className="simple-day-options"><summary>걷기·휴식·마치는 시각</summary>{trip.activeDay && <DayDeadlineControl key={trip.activeDay} day={trip.activeDay} value={trip.dayDeadlines[trip.activeDay]} entries={active?.entries || []} onChange={value => trip.applyTripCommand({ type: 'deadline', day: trip.activeDay, value })} />}<TripComfortPlan trip={trip} coverage={coverage} schedule={schedule} />{!!active?.entries.length && <div className="travel-book-actions"><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('wave:open-restroom-finder', { detail: { contentId: active.entries.at(-1)?.place.id } }))}>화장실 찾기</button></div>}<RestStopFinder trip={trip} places={places} requiredKeys={requiredKeys} onSelectPlace={onSelectPlace} /></details></PlannerToolPortal>
      </section>
      {focusedEntry && <section className="simple-focus-stop" aria-label={`${focusedEntry.place.name} 선택 일정 상세`}>
        <div className="reference-focus-hero">
        <div className="simple-focus-photo"><SmartSpotImage src={focusedEntry.place.image} title={focusedEntry.place.name} region={focusedEntry.place.city} contentId={focusedEntry.place.id} tag="관광" rank={0} showMeta={false} /></div>
        <div className="simple-focus-overlay"><time>{focusedEntry.startsAtLabel}</time><button className="simple-edit-stop" type="button" onClick={() => setEditing(focusedEntry.place)} aria-label={`${focusedEntry.place.name} 일정 수정`} title="수정"><ActionIcon label="수정" /></button></div>
        <div className="simple-focus-copy">
          <h3><button type="button" onClick={() => onSelectPlace(focusedEntry.place)}>{focusedEntry.place.name}</button></h3>
          <p>{focusedEntry.visitMinutes}분 머물러요 · {focusedEntry.visitEndsAtLabel}까지</p>
          <PlaceFacilitySummary place={focusedEntry.place} en={false} />
        </div>
        </div>
        <div className="simple-focus-details">
          <TripBreakSummary minutes={focusedEntry.breakMinutes} purpose={trip.restPurposeByPlaceId[focusedEntry.place.id]} start={focusedEntry.visitEndsAtLabel} end={focusedEntry.endsAtLabel} />
          <FixedVisitSummary fixed={trip.fixedVisits[focusedEntry.place.id]} waiting={focusedEntry.waitingMinutes} late={focusedEntry.lateMinutes} />
          <div className="simple-stop-controls">
            <button type="button" aria-label={`${focusedEntry.place.name} 같은 날 앞 순서로 이동`} disabled={!focusedMovement?.up} onClick={() => trip.applyTripCommand({ type: 'move', id: focusedEntry.place.id, direction: 'up' })} data-icon-action="" title="앞"><NightIcon name="up" size={20}/><span className="sr-only">앞</span></button>
            <button type="button" aria-label={`${focusedEntry.place.name} 같은 날 뒤 순서로 이동`} disabled={!focusedMovement?.down} onClick={() => trip.applyTripCommand({ type: 'move', id: focusedEntry.place.id, direction: 'down' })} data-icon-action="" title="뒤"><NightIcon name="down" size={20}/><span className="sr-only">뒤</span></button>
            <button type="button" aria-label={`${focusedEntry.place.name} 지도에서 보기`} aria-pressed={focusedEntry.place.id === focusedPlaceId} disabled={!supportedPlacePoint(focusedEntry.place.mapX, focusedEntry.place.mapY)} onClick={() => onFocusPlace(focusedEntry.place)} data-icon-action="" title="지도"><NightIcon name="map" size={20}/><span className="sr-only">지도</span></button>
            <button type="button" aria-label={`${focusedEntry.place.name} 비슷한 장소로 교체`} onClick={() => onAlternative(focusedEntry.place.id)} data-icon-action="" title="비슷한 장소로 교체"><NightIcon name="route"/></button>
          </div>
          <PlaceVisitHours id={focusedEntry.place.id} name={focusedEntry.place.name} visit={{ day: active!.day, startsAt: focusedEntry.startsAt, endsAt: focusedEntry.endsAt }} />
          <section className="reference-info-card"><header><h3><NightIcon name="access" size={20}/>접근성 정보</h3><button type="button" onClick={() => onSelectPlace(focusedEntry.place)}>자세히 보기 <NightIcon name="right" size={15}/></button></header><div className="reference-access-grid">{[{ key: 'route', icon: 'access' }, { key: 'parking', icon: 'car' }, { key: 'restroom', icon: 'user' }, { key: 'audioguide', icon: 'volume' }].map(({ key, icon }) => {
            const item = (focusedEntry.place as Place).accessibility?.find(field => field.key === key);
            return <div key={key}><NightIcon name={icon} size={24}/><span>{facilityLabel(key, false)}</span><b data-state={item?.state || 'unknown'}>{item?.state === 'confirmed' ? '확인됨' : item?.state === 'negative' ? '제공 안 함' : '미확인'}</b></div>;
          })}</div></section>
          <section className="reference-info-card"><header><h3><NightIcon name="pin" size={20}/>{nearbyPlaces.length ? '같은 지역 다른 장소' : '함께 담은 장소'}</h3></header><div className="reference-nearby-list">{relatedPlaces.map(place => <button type="button" key={place.id} onClick={() => onSelectPlace(place)}><SmartSpotImage src={place.image} title={place.name} region={place.city} contentId={place.id} tag="관광" rank={0} showMeta={false} compact/><span><b>{place.name}</b><small>{place.city} · 장소 정보 확인</small></span><NightIcon name="right" size={18}/></button>)}{!relatedPlaces.length && <p>다른 장소를 담으면 여기서 함께 볼 수 있어요.</p>}</div></section>
          <section className="reference-info-card reference-place-note"><header><h3><NightIcon name="edit" size={20}/>한마디 메모</h3><button type="button" aria-expanded={memoOpen} onClick={() => setMemoOpen(value => !value)}>{memoOpen ? '완료' : '메모 추가'} <NightIcon name={memoOpen ? 'check' : 'plus'} size={15}/></button></header>{memoOpen ? <label className="reference-memo-editor"><span className="sr-only">{focusedEntry.place.name} 메모</span><textarea maxLength={500} value={memos[focusedEntry.place.id] || ''} onChange={event => setMemos(current => ({ ...current, [focusedEntry.place.id]: event.target.value }))} placeholder="동행에게 알려줄 내용을 적어보세요."/></label> : <p>{memos[focusedEntry.place.id] || '장소를 선택해 정보를 확인하고, 동행에게 전할 메모를 남겨보세요.'}</p>}<small>이 화면에서만 유지되는 메모입니다.</small></section>
        </div>
      </section>}
      {mapMounted && <div className="simple-itinerary-map" hidden={!mapView}>{map}</div>}
    </div>
    {editing && <Suspense fallback={<LoadingState>일정 수정을 열고 있어요.</LoadingState>}><StopEditor key={editing.id} place={editing} trip={trip} onClose={closeEditor} /></Suspense>}
  </>;
}
