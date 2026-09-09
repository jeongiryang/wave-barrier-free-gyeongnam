"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSitePreferences } from "../../../components/SitePreferences";
import { originalLanguage } from "../place-copy";
import { buildTravelJournalHref } from "../../../lib/community/field-report.js";
import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";
import { buildItinerarySchedule, routeMinutesForOriginLeg } from "../optimization/itinerary-schedule.js";
import type { PlanData } from "../types";
import TripDateNotice from "./TripDateNotice";
import { regionNames } from "../../../lib/gyeongnam-region-names";

const TravelBookArchiveAction = lazy(() => import("../../travel-book/TravelBookArchiveAction"));
function AudioUnavailable() {
  const { locale } = useSitePreferences();
  return <p role="status">{locale === "en" ? "The audio guide couldn't open. You can keep editing your itinerary. Try the guide again after reloading the page." : "오디오 해설을 열지 못했습니다. 일정은 계속 편집할 수 있습니다. 페이지를 새로 연 뒤 해설을 다시 시도해 주세요."}</p>;
}
const AudioGuidePlayer = lazy(() => import("./AudioGuidePlayer").catch(() => ({ default: AudioUnavailable })));

export default function TripDayPlanner({ plan, tripSelection, route, audioGuide, participation, archiveContext, itineraryRouteMinutes = {} }: {
  itineraryRouteMinutes?: Record<string, number>;
  plan: PlanData | null;
  tripSelection: ReturnType<typeof useTripSelection>;
  route: ReturnType<typeof useRoutePlanning>;
  audioGuide: ReturnType<typeof useAudioGuide>;
  participation: ReturnType<typeof usePlannerParticipation>;
  archiveContext: { region: string; theme: string; profiles: string[] };
}) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  const c = (ko: string, english: string) => en ? english : ko;
  const [extrasOpen, setExtrasOpen] = useState(false);
  const {
    scheduleAssignments, tripDays, orderedSavedPlaces, orderExplanation,
    assignPlaceToDay, dayStartTime, setDayStartTime,
    orderMode, orderNotice, movePlace, movementFor, restoreAutoOrder, toggleSaved,
  } = tripSelection;
  const [edit, setEdit] = useState<{ name: string; day?: number } | null>(null);
  const editNotice = edit ? edit.day ? c(`${edit.name}을(를) DAY ${edit.day}로 옮겼습니다.`, `${edit.name} moved to DAY ${edit.day}.`) : c(`${edit.name}을(를) 일정에서 제거했습니다.`, `${edit.name} removed from the itinerary.`) : "";
  const outsideDates = orderedSavedPlaces.filter((place) => scheduleAssignments[place.id] && !tripDays.includes(scheduleAssignments[place.id]));
  const tripRegions = [...new Set(orderedSavedPlaces.map(place => place.city).filter(Boolean))];
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
  if (!orderedSavedPlaces.length) return <section className="day-planner empty" data-reveal aria-label={c("내 일정", "My itinerary")}>
    <div className="itinerary-empty-state"><span aria-hidden="true">+</span><h3>{c("아직 일정에 추가한 장소가 없어요.", "No places in your itinerary yet.")}</h3><p>{c("위 추천 여행지에서 ‘일정에 추가’를 누르면 이곳에서 날짜, 순서와 이동시간을 정리할 수 있습니다.", "Add a recommended place to arrange its date, order and travel time here.")}</p></div>
  </section>;
  return <section className="day-planner" data-reveal aria-label={c("날짜별 여행 일정", "Itinerary by date")}>
    {tripRegions.length > 1 && <p className="multi-region-notice" role="status">{c("여러 지역 일정", "Multi-region itinerary")}: {tripRegions.map(name => en ? regionNames[name] || name : name).join(" · ")}. {c("지역 사이 장거리 이동과 자정 초과 가능성을 확인하고 필요하면 다른 날짜로 나누세요. 추정 시간은 실제 교통 조회가 아닙니다.", "Check long journeys between regions and possible travel past midnight. Split places across dates when needed. Estimated times are not checked transport results.")}</p>}
    <div className="date-range-fields"><label>{c("여행 시작일", "Trip start date")}<input type="date" value={tripSelection.travelStart} aria-describedby="itinerary-date-notice" onChange={(event) => tripSelection.changeTravelStart(event.target.value)} /></label><label>{c("여행 마지막 날", "Trip end date")}<input type="date" min={tripSelection.travelStart} max={tripSelection.lastTravelDate} value={tripSelection.travelEnd} aria-describedby="itinerary-date-notice" onChange={(event) => tripSelection.changeTravelEnd(event.target.value)} /></label></div>
    <TripDateNotice id="itinerary-date-notice" notice={tripSelection.dateNotice} />
    <p className="date-scope-note">{c("여행 날짜는 날씨·행사 조회에 반영됩니다. 날짜 변경으로 장소의 편의시설 정보가 달라지는 것은 아닙니다.", "Dates affect weather and event searches. Changing a date does not change a place's facility information.")}</p>
    {en && <p className="date-scope-note">Place names, addresses and provider descriptions may be supplied in Korean and are shown in their original language.</p>}
    {outsideDates.length > 0 && <section className="outside-trip-dates" aria-label={c("다른 날짜에 보관된 장소", "Places outside these dates")}><h3>{c(`이 기간 밖에 보관된 장소 ${outsideDates.length}곳`, `${outsideDates.length} places outside these dates`)}</h3><p>{c("날짜를 바꿔도 이전 일정은 자동으로 옮기지 않습니다. 이번 여행에 넣을 장소만 직접 이동하세요.", "Changing dates does not move earlier plans automatically. Move only the places you want in this trip.")}</p><ul>{outsideDates.map((place) => <li key={place.id}><span><span lang={originalLanguage(place.name)}>{place.name}</span> · {scheduleAssignments[place.id]}</span><select aria-label={c(`${place.name} 이번 여행 날짜로 이동`, `${place.name} move to a date in this trip`)} value="" onChange={(event) => assignPlaceToDay(place.id, event.target.value)}><option value="" disabled>{c("날짜 선택", "Choose a date")}</option>{tripDays.map((day) => <option key={day} value={day}>{day}</option>)}</select><button type="button" onClick={() => toggleSaved(place.id)}>{c("일정에서 제거", "Remove from itinerary")}</button></li>)}</ul></section>}
    <header><div><span>{c("내 일정", "My itinerary")}</span><h3>{c(`${orderedSavedPlaces.length - outsideDates.length}곳을 날짜별로 정리했어요.`, `${orderedSavedPlaces.length - outsideDates.length} places arranged by date.`)}</h3></div><div className="day-start-control"><label htmlFor="day-start-time">{c("하루 시작", "Day starts at")}</label><input id="day-start-time" type="time" value={dayStartTime} onChange={(event) => setDayStartTime(event.target.value)} /><small>{c("확인한 실제 경로가 있으면 이동시간에 반영합니다.", "Checked routes are used for travel times when available.")}</small></div></header>
    <div className="day-order-toolbar"><div><strong>{orderMode === "manual" ? c("내가 정한 순서", "Your visit order") : c("추천 순서", "Suggested order")}</strong><p className="day-planner-explanation">{orderExplanation} {c("날짜와 순서는 이 기기와 공유 일정에 저장됩니다.", "Dates and order are saved on this device and in shared snapshots.")}</p></div>{orderMode === "manual" && <button type="button" onClick={() => { restoreAutoOrder(); setEdit(null); }}>{c("추천 순서로 정렬", "Restore suggested order")}</button>}</div>
    <p className="day-order-help">{c("위·아래 버튼은 같은 날짜 안에서만 움직입니다. 첫 장소의 ‘앞으로’와 마지막 장소의 ‘뒤로’는 사용할 수 없습니다.", "Earlier and Later move places within the same day. The first cannot move earlier and the last cannot move later.")}</p>
    <p className="sr-only" role="status" aria-live="polite">{editNotice || orderNotice}</p>
    <div className="day-planner-grid">{schedule.map(({ day, entries }, dayIndex) => <article key={day}>
      <div><small>DAY {String(dayIndex + 1).padStart(2, "0")}</small><strong>{new Intl.DateTimeFormat(en ? "en-GB" : "ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${day}T12:00:00`))}</strong></div>
      <ol>{entries.map((entry, index) => { const movement = movementFor(entry.place.id); return <li key={entry.place.id}>
        <span>{index + 1}</span>
        <div className="day-place-copy"><b>{entry.startsAtLabel} · <span lang={originalLanguage(entry.place.name)}>{entry.place.name}</span></b><small>{entry.travelSource === "route" ? c("확인된 경로", "Checked route") : entry.travelSource === "estimate" ? c("직선거리 기반 추정", "Straight-line estimate") : c("경로 미확인 · 임시", "Route unchecked · provisional")} {c(`이동 ${entry.travelMinutes}분 · 체류 ${entry.visitMinutes}분 · ${entry.endsAtLabel} 종료`, `travel ${entry.travelMinutes} min · visit ${entry.visitMinutes} min · ends ${entry.endsAtLabel}`)}</small><small lang={originalLanguage(entry.place.address || entry.place.city)}>{entry.place.address || entry.place.city}</small><small className="day-evidence">{entry.place.knownFields ? c(`공식 정보 ${entry.place.knownFields}개 기록 · 방문 전 재확인`, `${entry.place.knownFields} official fields recorded · recheck before visiting`) : c("편의시설 정보 확인 필요", "Check facility information")}</small>{entry.crossesDateBoundary && <em>{c("일정이 다음 날로 이어집니다.", "This schedule continues into the next day.")}</em>}</div>
        <div className="day-place-editor">
          <select aria-label={c(`${entry.place.name} 여행 날짜`, `${entry.place.name} trip date`)} value={scheduleAssignments[entry.place.id] || tripDays[0]} onChange={(event) => { assignPlaceToDay(entry.place.id, event.target.value); setEdit({ name: entry.place.name, day: tripDays.indexOf(event.target.value) + 1 }); }}>{tripDays.map((date, dateIndex) => <option key={date} value={date}>DAY {dateIndex + 1} · {date}</option>)}</select>
          <div className="day-order-buttons"><button type="button" disabled={!movement.up} aria-label={c(`${entry.place.name} 같은 날 앞 순서로 이동`, `${entry.place.name} move earlier in the same day`)} title={movement.up ? c("같은 날 앞 장소와 순서를 바꿉니다.", "Swap with the previous place in this day.") : c("이 날짜의 첫 장소입니다.", "This is the first place in this day.")} onClick={() => { movePlace(entry.place.id, "up"); setEdit(null); }}>↑ {c("앞", "Earlier")}</button><button type="button" disabled={!movement.down} aria-label={c(`${entry.place.name} 같은 날 뒤 순서로 이동`, `${entry.place.name} move later in the same day`)} title={movement.down ? c("같은 날 뒤 장소와 순서를 바꿉니다.", "Swap with the next place in this day.") : c("이 날짜의 마지막 장소입니다.", "This is the last place in this day.")} onClick={() => { movePlace(entry.place.id, "down"); setEdit(null); }}>↓ {c("뒤", "Later")}</button><button type="button" className="remove" aria-label={c(`${entry.place.name} 일정에서 제거`, `${entry.place.name} remove from itinerary`)} onClick={() => { toggleSaved(entry.place.id); setEdit({ name: entry.place.name }); }}>{c("제거", "Remove")}</button></div>
        </div>
      </li>; })}</ol>
      {!entries.length && <p>{c("일정에 추가한 장소의 날짜를 이 날로 바꿔 보세요.", "Move a saved place to this date to plan this day.")}</p>}
    </article>)}</div>
    <div className="itinerary-primary-actions">
      <div><strong>{c("일정 저장·공유", "Save and share")}</strong><p>{c("선택한 장소, 날짜와 순서를 30일 동안 공유 링크로 보관합니다.", "A shared link keeps the selected places, dates and order for 30 days.")}</p></div>
      <button type="button" onClick={() => { if (!outsideDates.length && shareState !== "saving") void sharePlan(); }} disabled={outsideDates.length > 0} aria-disabled={outsideDates.length > 0 || shareState === "saving"} aria-busy={shareState === "saving"}>{shareState === "saving" ? c("링크 만드는 중", "Creating link") : shareState === "done" ? c("링크 복사 완료", "Link copied") : c("공유 링크 만들기", "Create shared link")}</button>
      {shareUrl && <a href={shareUrl}>{c("공유 일정 열기", "Open shared itinerary")}</a>}
      {shareState === "error" && <small role="alert">{c("공유 링크를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.", "The shared link couldn't be created. Please try again.")}</small>}
      {shareState === "copy-error" && <small role="alert">{c("공유 링크는 만들었지만 복사하지 못했습니다. 공유 일정을 열어 주소를 직접 복사하거나 다시 시도해 주세요.", "The link was created but couldn't be copied. Open the shared itinerary and copy its address, or try again.")}</small>}
    </div>
    <Suspense fallback={<p role="status">{c("여행집 보관 기능을 준비하고 있어요.", "Preparing saved itineraries.")}</p>}><TravelBookArchiveAction
      places={orderedSavedPlaces}
      region={archiveContext.region}
      theme={archiveContext.theme}
      profiles={archiveContext.profiles}
      travelStart={tripSelection.travelStart}
      travelEnd={tripSelection.travelEnd}
      dayStartTime={dayStartTime}
      scheduleAssignments={scheduleAssignments}
    /></Suspense>
    <details className="itinerary-secondary-actions" onToggle={(event) => { const open = event.currentTarget.open; if (!open) audioGuide.resetAudio(); setExtrasOpen(open); }}>
      <summary>{c("오디오 가이드와 여행 후기", "Audio guide and travel journal")} <span>{c("선택 사항", "Optional")}</span></summary>
      {extrasOpen && <Suspense fallback={<p role="status">{c("오디오 해설을 준비하고 있어요.", "Preparing the audio guide.")}</p>}><AudioGuidePlayer audio={plan?.audio} controller={audioGuide} /></Suspense>}
      {plan?.course && <div className="itinerary-course"><strong lang={originalLanguage(plan.course.name)}>{plan.course.name}</strong><p lang={originalLanguage(plan.course.summary)}>{plan.course.summary}</p><span>{plan.course.distance}km · {plan.course.minutes}{c("분 · 난이도", " min · difficulty")} {plan.course.level}</span></div>}
      <div className="day-journal-action"><div><strong>{c("다녀온 뒤 여행 후기로 이어가기", "Write a journal after your trip")}</strong><p>{c("장소와 날짜만 초안에 연결하며, 현장 경험은 공식 정보와 분리해 표시합니다.", "Only places and dates go into the draft. Visitor experiences stay separate from official information.")}</p></div><Link href={journalHref}>{c("후기 초안 만들기", "Create journal draft")} <span aria-hidden="true">→</span></Link></div>
    </details>
  </section>;
}
