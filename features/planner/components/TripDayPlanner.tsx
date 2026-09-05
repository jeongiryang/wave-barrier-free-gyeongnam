"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buildTravelJournalHref } from "../../../lib/community/field-report.js";
import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import { buildItinerarySchedule, routeMinutesForOriginLeg } from "../optimization/itinerary-schedule.js";
import type { PlanData } from "../types";
import TravelBookArchiveAction from "../../travel-book/TravelBookArchiveAction";
import AudioGuidePlayer from "./AudioGuidePlayer";

export default function TripDayPlanner({ plan, tripSelection, route, audioGuide, participation, archiveContext, itineraryRouteMinutes = {} }: {
  itineraryRouteMinutes?: Record<string, number>;
  plan: PlanData | null;
  tripSelection: ReturnType<typeof useTripSelection>;
  route: ReturnType<typeof useRoutePlanning>;
  audioGuide: ReturnType<typeof useAudioGuide>;
  participation: ReturnType<typeof usePlannerParticipation>;
  archiveContext: { region: string; theme: string; profiles: string[] };
}) {
  const {
    scheduleAssignments, tripDays, orderedSavedPlaces, orderExplanation,
    assignPlaceToDay, dayStartTime, setDayStartTime,
    orderMode, orderNotice, movePlace, movementFor, restoreAutoOrder, toggleSaved,
  } = tripSelection;
  const [editNotice, setEditNotice] = useState("");
  const outsideDates = orderedSavedPlaces.filter((place) => scheduleAssignments[place.id] && !tripDays.includes(scheduleAssignments[place.id]));
  const routeMinutesByPlaceId = useMemo(() => ({ ...routeMinutesForOriginLeg({
    places: orderedSavedPlaces,
    days: tripDays,
    assignments: scheduleAssignments,
    destinationId: route.routeDestination?.id,
    routeMinutes: route.activeRoute?.configured && (!route.routeStart || route.routeStart.lat === route.origin.lat && route.routeStart.lng === route.origin.lng) ? route.activeRoute.totalTime : undefined,
  }), ...itineraryRouteMinutes }), [orderedSavedPlaces, route.activeRoute, route.routeDestination, route.routeStart, route.origin, scheduleAssignments, tripDays, itineraryRouteMinutes]);
  const schedule = useMemo(() => buildItinerarySchedule({
    places: orderedSavedPlaces,
    days: tripDays,
    assignments: scheduleAssignments,
    startTime: dayStartTime,
    origin: route.origin,
    routeMinutesByPlaceId,
  }), [dayStartTime, orderedSavedPlaces, route.origin, routeMinutesByPlaceId, scheduleAssignments, tripDays]);
  const journalHref = useMemo(() => buildTravelJournalHref({
    places: orderedSavedPlaces.map((place) => ({ id: place.id, name: place.name, day: scheduleAssignments[place.id] || tripDays[0] })),
    region: orderedSavedPlaces[0]?.city || "",
    visitDate: tripDays[0],
  }), [orderedSavedPlaces, scheduleAssignments, tripDays]);
  const { shareState, shareUrl, sharePlan } = participation;
  if (!orderedSavedPlaces.length) return <section className="day-planner empty" data-reveal aria-label="이 기기 일정">
    <div className="itinerary-empty-state"><span aria-hidden="true">+</span><h3>아직 일정에 추가한 장소가 없어요.</h3><p>위 추천 여행지에서 ‘일정에 추가’를 누르면 이곳에서 날짜, 순서와 이동시간을 정리할 수 있습니다.</p></div>
  </section>;
  return <section className="day-planner" data-reveal aria-label="날짜별 여행 일정">
    <div className="date-range-fields"><label>여행 시작일<input type="date" value={tripSelection.travelStart} onChange={(event) => tripSelection.changeTravelStart(event.target.value)} /></label><label>여행 마지막 날<input type="date" min={tripSelection.travelStart} value={tripSelection.travelEnd} onChange={(event) => tripSelection.changeTravelEnd(event.target.value)} /></label></div>
    <p className="date-scope-note">여행 날짜는 날씨·행사 조회에 반영됩니다. 날짜 변경으로 장소의 편의시설 정보가 달라지는 것은 아닙니다.</p>
    {outsideDates.length > 0 && <section className="outside-trip-dates" aria-label="다른 날짜에 보관된 장소"><h4>이 기간 밖에 보관된 장소 {outsideDates.length}곳</h4><p>날짜를 바꿔도 이전 일정은 자동으로 옮기지 않습니다. 이번 여행에 넣을 장소만 직접 이동하세요.</p><ul>{outsideDates.map((place) => <li key={place.id}><span>{place.name} · {scheduleAssignments[place.id]}</span><select aria-label={`${place.name} 이번 여행 날짜로 이동`} value="" onChange={(event) => assignPlaceToDay(place.id, event.target.value)}><option value="" disabled>날짜 선택</option>{tripDays.map((day) => <option key={day} value={day}>{day}</option>)}</select><button type="button" onClick={() => toggleSaved(place.id)}>일정에서 제거</button></li>)}</ul></section>}
    <header><div><span>이 기기 일정</span><h3>{orderedSavedPlaces.length}곳을 날짜별로 정리했어요.</h3></div><div className="day-start-control"><label htmlFor="day-start-time">하루 시작</label><input id="day-start-time" type="time" value={dayStartTime} onChange={(event) => setDayStartTime(event.target.value)} /><small>확인한 실제 경로가 있으면 이동시간에 반영합니다.</small></div></header>
    <div className="day-order-toolbar"><div><strong>{orderMode === "manual" ? "내가 정한 순서" : "추천 순서"}</strong><p className="day-planner-explanation">{orderExplanation} 날짜와 순서는 이 기기와 공유 일정에 저장됩니다.</p></div>{orderMode === "manual" && <button type="button" onClick={() => { restoreAutoOrder(); setEditNotice(""); }}>추천 순서로 정렬</button>}</div>
    <p className="day-order-help">위·아래 버튼은 같은 날짜 안에서만 움직입니다. 첫 장소의 ‘앞으로’와 마지막 장소의 ‘뒤로’는 사용할 수 없습니다.</p>
    <p className="sr-only" role="status" aria-live="polite">{editNotice || orderNotice}</p>
    <div className="day-planner-grid">{schedule.map(({ day, entries }, dayIndex) => <article key={day}>
      <div><small>DAY {String(dayIndex + 1).padStart(2, "0")}</small><strong>{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${day}T12:00:00`))}</strong></div>
      <ol>{entries.map((entry, index) => { const movement = movementFor(entry.place.id); return <li key={entry.place.id}>
        <span>{index + 1}</span>
        <div className="day-place-copy"><b>{entry.startsAtLabel} · {entry.place.name}</b><small>{entry.travelSource === "route" ? "확인된 경로" : entry.travelSource === "estimate" ? "직선거리 기반 추정" : "경로 미확인 · 임시"} 이동 {entry.travelMinutes}분 · 체류 {entry.visitMinutes}분 · {entry.endsAtLabel} 종료</small><small>{entry.place.address || entry.place.city}</small><small className="day-evidence">{entry.place.knownFields ? `공식 정보 ${entry.place.knownFields}개 기록 · 방문 전 재확인` : "편의시설 정보 확인 필요"}</small>{entry.crossesDateBoundary && <em>일정이 다음 날로 이어집니다.</em>}</div>
        <div className="day-place-editor">
          <select aria-label={`${entry.place.name} 여행 날짜`} value={scheduleAssignments[entry.place.id] || tripDays[0]} onChange={(event) => { assignPlaceToDay(entry.place.id, event.target.value); setEditNotice(`${entry.place.name}을(를) DAY ${tripDays.indexOf(event.target.value) + 1}로 옮겼습니다.`); }}>{tripDays.map((date, dateIndex) => <option key={date} value={date}>DAY {dateIndex + 1}</option>)}</select>
          <div className="day-order-buttons"><button type="button" disabled={!movement.up} aria-label={`${entry.place.name} 같은 날 앞 순서로 이동`} title={movement.up ? "같은 날 앞 장소와 순서를 바꿉니다." : "이 날짜의 첫 장소입니다."} onClick={() => { movePlace(entry.place.id, "up"); setEditNotice(""); }}>↑ 앞</button><button type="button" disabled={!movement.down} aria-label={`${entry.place.name} 같은 날 뒤 순서로 이동`} title={movement.down ? "같은 날 뒤 장소와 순서를 바꿉니다." : "이 날짜의 마지막 장소입니다."} onClick={() => { movePlace(entry.place.id, "down"); setEditNotice(""); }}>↓ 뒤</button><button type="button" className="remove" aria-label={`${entry.place.name} 일정에서 제거`} onClick={() => { toggleSaved(entry.place.id); setEditNotice(`${entry.place.name}을(를) 일정에서 제거했습니다.`); }}>제거</button></div>
        </div>
      </li>; })}</ol>
      {!entries.length && <p>일정에 추가한 장소의 날짜를 이 날로 바꿔 보세요.</p>}
    </article>)}</div>
    <div className="itinerary-primary-actions">
      <div><strong>일정 저장·공유</strong><p>선택한 장소, 날짜와 순서를 30일 동안 공유 링크로 보관합니다.</p></div>
      <button type="button" onClick={sharePlan} disabled={!plan || shareState === "saving"}>{shareState === "saving" ? "링크 만드는 중" : shareState === "done" ? "링크 복사 완료" : "공유 링크 만들기"}</button>
      {shareUrl && <a href={shareUrl}>공유 일정 열기</a>}
      {shareState === "error" && <small role="alert">공유 링크를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.</small>}
    </div>
    <TravelBookArchiveAction
      places={orderedSavedPlaces}
      region={archiveContext.region}
      theme={archiveContext.theme}
      profiles={archiveContext.profiles}
      travelStart={tripSelection.travelStart}
      travelEnd={tripSelection.travelEnd}
      dayStartTime={dayStartTime}
      scheduleAssignments={scheduleAssignments}
    />
    <details className="itinerary-secondary-actions">
      <summary>오디오 가이드와 여행 후기 <span>선택 사항</span></summary>
      <AudioGuidePlayer audio={plan?.audio} controller={audioGuide} />
      {plan?.course && <div className="itinerary-course"><strong>{plan.course.name}</strong><p>{plan.course.summary}</p><span>{plan.course.distance}km · {plan.course.minutes}분 · 난이도 {plan.course.level}</span></div>}
      <div className="day-journal-action"><div><strong>다녀온 뒤 여행 후기로 이어가기</strong><p>장소와 날짜만 초안에 연결하며, 현장 경험은 공식 정보와 분리해 표시합니다.</p></div><Link href={journalHref}>후기 초안 만들기 <span aria-hidden="true">→</span></Link></div>
    </details>
  </section>;
}
