"use client";

import { lazy, Suspense, useMemo } from "react";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { useItineraryRoutes } from "../hooks/useItineraryRoutes";
import type { WeatherData } from "../types";
import type { RoutePoint } from "../../routing/types";
import { buildItinerarySchedule } from "../optimization/itinerary-schedule.js";
const TravelBookArchiveAction = lazy(() => import("../../travel-book/TravelBookArchiveAction").catch(() => ({ default: function ArchiveUnavailable() { return <p role="alert">일정 저장 기능을 불러오지 못했어요. 일정은 계속 편집할 수 있습니다. <button type="button" onClick={() => window.location.reload()}>화면 다시 불러오기</button></p>; } })));
import WeatherVisual from "./WeatherVisual";
import { DayDeadlineSummary } from "./DayDeadlineControl";
import { FixedVisitSummary } from "./FixedVisitControl";

export function PlannerWeatherCard({ weather, loading, region }: { weather: WeatherData | null; loading: boolean; region: string }) {
  return <section className="reference-weather" aria-label="여행 날씨"><small>{region} 여행 날씨</small>{weather ? <><strong>{weather.current.label}<b>{weather.current.temperature}°</b></strong><WeatherVisual code={weather.current.code} /><p>강수 {weather.current.precipitation}mm · 바람 {weather.current.wind}m/s</p><span>현재 날씨 · {weather.updatedAt ? new Date(weather.updatedAt).toLocaleDateString("ko-KR") : weather.source}</span></> : <><strong>{loading ? "날씨 확인 중" : "날씨 확인 필요"}</strong><p>{loading ? "여행 지역의 날씨를 불러오고 있어요." : "날씨가 도착하면 이곳에서 확인할 수 있어요."}</p></>}</section>;
}

export default function PlannerTripOverview({ trip, participation, coverage, origin, weather, weatherLoading, region, theme, profiles, onEdit, onMap, onDetails, onSelectPlace }: {
  trip: ReturnType<typeof useTripSelection>; participation: ReturnType<typeof usePlannerParticipation>;
  coverage: ReturnType<typeof useItineraryRoutes>; origin: RoutePoint;
  weather: WeatherData | null; weatherLoading: boolean; region: string; theme: string; profiles: string[];
  onMap: () => void; onEdit: () => void; onDetails: () => void; onSelectPlace: (place: ReturnType<typeof useTripSelection>["orderedSavedPlaces"][number]) => void;
}) {
  const schedule = useMemo(() => buildItinerarySchedule({ places: trip.orderedSavedPlaces, days: trip.tripDays, assignments: trip.scheduleAssignments, startTime: trip.dayStartTime, visitMinutesByPlaceId: trip.visitMinutesByPlaceId, fixedVisits: trip.fixedVisits, origin, routeMinutesByPlaceId: coverage.routeMinutes }), [trip.orderedSavedPlaces, trip.tripDays, trip.scheduleAssignments, trip.dayStartTime, trip.visitMinutesByPlaceId, trip.fixedVisits, origin, coverage.routeMinutes]);
  const inPeriod = trip.orderedSavedPlaces.filter(place => trip.tripDays.includes(trip.scheduleAssignments[place.id] || trip.tripDays[0]));
  const canShare = inPeriod.length > 0 && inPeriod.length === trip.orderedSavedPlaces.length;
  return <>
    <p className="reference-subtitle">일정, 이동 경로, 접근성 정보와 날씨를 마지막으로 확인합니다.</p>
    <div className="reference-trip-banner"><div><h3>{trip.travelStart.replaceAll("-", ". ")} - {trip.travelEnd.slice(5).replace("-", ". ")}</h3><p>{trip.tripDays.length > 1 ? `${trip.tripDays.length - 1}박 ${trip.tripDays.length}일` : "당일 여행"} · {region} · 여행지 {inPeriod.length}곳</p></div><ol className="reference-route-chain" aria-label="전체 방문 순서">{inPeriod.map((place, index) => <li key={place.id}><b>{index + 1}</b><span>{place.name}</span></li>)}</ol></div>
    <div className="reference-overview-grid">
      <section className="reference-schedule"><header><h3>전체 일정</h3><button type="button" onClick={onEdit}>일정 수정하기</button></header>
        {schedule.map(({ day, entries }, index) => <article key={day}><h4><span>DAY {index + 1}</span>{new Date(`${day}T12:00:00`).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}</h4><ol>{entries.map(entry => <li key={entry.place.id}><time>{entry.startsAtLabel}</time><button type="button" onClick={() => onSelectPlace(entry.place)}>{entry.place.name}</button><small>{entry.travelSource === "route" ? `이동 ${entry.travelMinutes}분` : "이동 시간 미확인"} · 체류 {entry.visitMinutes}분</small><FixedVisitSummary fixed={trip.fixedVisits[entry.place.id]} waiting={entry.waitingMinutes} late={entry.lateMinutes} /></li>)}</ol><DayDeadlineSummary entries={entries} value={trip.dayDeadlines[day]} />{!entries.length && <p>아직 추가한 여행지가 없어요.</p>}</article>)}
      </section>
      <aside><PlannerWeatherCard weather={weather} loading={weatherLoading} region={region} /><section className="reference-info-card"><h3>이동 경로 요약</h3><p>{coverage.loading ? "이동 구간을 확인하고 있어요." : `${coverage.legs.length}개 구간 중 ${coverage.readyCount}개 확인`}</p><button type="button" onClick={onMap}>지도에서 경로 보기 →</button></section><section className="reference-info-card"><h3>접근성 정보</h3><div className="reference-tags">{profiles.map(profile => <span key={profile}>{profile}</span>)}</div><p>선택한 편의 조건입니다. 장소별 확인 결과와 미확인 항목을 확인하세요.</p><button type="button" onClick={onDetails}>날씨·접근성 정보 자세히 보기 →</button></section></aside>
    </div>
    <div className="reference-bottom-bar reference-final-actions"><div><strong>{region} · 여행지 {inPeriod.length}곳</strong><small>{canShare ? "저장한 뒤에도 일정을 다시 수정할 수 있어요." : "기간 밖 여행지의 방문 날짜를 확인해 주세요."}</small></div><button type="button" className="reference-secondary" disabled={!canShare || participation.shareState === "saving"} onClick={() => void participation.sharePlan()}>{participation.shareState === "saving" ? "링크 만드는 중" : "공유하기"}</button><Suspense fallback={<p role="status">저장 기능을 준비하고 있어요.</p>}><TravelBookArchiveAction compact places={trip.orderedSavedPlaces} region={region} theme={theme} profiles={profiles} travelStart={trip.travelStart} travelEnd={trip.travelEnd} dayStartTime={trip.dayStartTime} scheduleAssignments={trip.scheduleAssignments} visitMinutesByPlaceId={trip.visitMinutesByPlaceId} fixedVisits={trip.fixedVisits} dayDeadlines={trip.dayDeadlines} /></Suspense></div>
    {participation.shareUrl && <p role="status"><a href={participation.shareUrl}>공유 일정 열기</a> · {participation.shareState === "copy-error" ? "주소를 직접 복사해 주세요." : "공유 링크를 만들었어요."}</p>}
    {participation.shareState === "error" && <p role="alert">공유 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
  </>;
}
