"use client";

import { useState } from "react";
import type { useTripSelection } from "../hooks/useTripSelection";
import { localDate } from "../utils";
import { useSitePreferences } from "../../../components/SitePreferences";
import { regionNames } from "../../../lib/gyeongnam-region-names";
import TripDateNotice from "./TripDateNotice";

export default function PlannerDateCalendar({ trip, region, onContinue, onPreferences }: { trip: ReturnType<typeof useTripSelection>; region: string; onContinue: () => void; onPreferences: () => void }) {
  const en = useSitePreferences().locale === "en";
  const c = (ko: string, english: string) => en ? english : ko;
  const [visibleMonth, setVisibleMonth] = useState("");
  const [selectingEnd, setSelectingEnd] = useState(false);
  const month = visibleMonth || trip.travelStart.slice(0, 7);
  if (!month) return <p className="wave-loading-inline" role="status">여행 날짜를 준비하고 있어요.</p>;
  const [year, monthNumber] = month.split("-").map(Number);
  const first = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const count = new Date(year, monthNumber, 0).getDate();
  const outside = trip.orderedSavedPlaces.filter(place => trip.scheduleAssignments[place.id] && !trip.tripDays.includes(trip.scheduleAssignments[place.id]));
  const label = (date: string) => new Intl.DateTimeFormat(en ? "en-GB" : "ko-KR", { month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00`));
  function shiftMonth(delta: number) {
    const date = new Date(year, monthNumber - 1 + delta, 1);
    setVisibleMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  function select(date: string) {
    if (!selectingEnd || date < trip.travelStart) {
      trip.changeTravelStart(date);
      setSelectingEnd(true);
    } else {
      trip.changeTravelEnd(date);
      if (date <= trip.lastTravelDate) setSelectingEnd(false);
    }
  }
  return <div className="reference-date-layout">
    <div>
      <div className="reference-date-fields"><label>{c("출발일", "Start date")}<input type="date" min={localDate()} value={trip.travelStart} onChange={e => { trip.changeTravelStart(e.target.value); setVisibleMonth(""); setSelectingEnd(true); }} /></label><label>{c("도착일", "End date")}<input type="date" min={trip.travelStart} max={trip.lastTravelDate} value={trip.travelEnd} onChange={e => trip.changeTravelEnd(e.target.value)} /></label></div>
      <div className="reference-calendar">
        <header><button type="button" aria-label={c("이전 달", "Previous month")} onClick={() => shiftMonth(-1)}>‹</button><h3>{en ? `${year} / ${monthNumber}` : `${year}년 ${monthNumber}월`}</h3><button type="button" aria-label={c("다음 달", "Next month")} onClick={() => shiftMonth(1)}>›</button></header>
        <div className="reference-calendar-grid" role="group" aria-label={en ? `Travel dates for ${year}-${monthNumber}` : `${year}년 ${monthNumber}월 여행 날짜 선택`}>
          {(en ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : ["월", "화", "수", "목", "금", "토", "일"]).map(day => <span key={day} className="weekday">{day}</span>)}
          {Array.from({ length: first }, (_, i) => <span key={`empty-${i}`} />)}
          {Array.from({ length: count }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            const selected = date >= trip.travelStart && date <= trip.travelEnd;
            return <button key={date} type="button" aria-label={en ? date : `${year}년 ${monthNumber}월 ${i + 1}일`} aria-pressed={selected} disabled={date < localDate()} data-endpoint={date === trip.travelStart || date === trip.travelEnd || undefined} onClick={() => select(date)}><span>{i + 1}</span></button>;
          })}
        </div>
        <p role="status">{selectingEnd ? c("도착일을 선택해 주세요. 여행 기간은 최대 7일입니다.", "Choose an end date. Trips can span up to seven days.") : c("출발일과 도착일을 차례로 선택하세요. 최대 7일까지 함께해요.", "Choose a start and end date, up to seven days apart.")}</p>
        <TripDateNotice id="reference-date-notice" notice={trip.dateNotice} />
      </div>
    </div>
    <aside className="reference-date-summary"><small>{c("선택한 여행", "Your trip")}</small><h3>{label(trip.travelStart)} - {label(trip.travelEnd)}</h3><p>{en ? `${trip.tripDays.length} days` : trip.tripDays.length > 1 ? `${trip.tripDays.length - 1}박 ${trip.tripDays.length}일` : "당일 여행"}</p><div className="reference-tint"><strong>{en ? regionNames[region] || "Gyeongnam" : region || "경남"}</strong><small>{en ? `${trip.orderedSavedPlaces.length} places selected` : `여행지 ${trip.orderedSavedPlaces.length}곳 선택`}</small></div><h4>{c("선택 기간", "Selected dates")}</h4><ol>{trip.tripDays.map((day, index) => <li key={day}><strong>{label(day)}</strong><small>DAY {index + 1}</small></li>)}</ol>
      {outside.length > 0 && <div className="reference-date-reassign"><p role="status">기존 날짜에 남아 있는 여행지 {outside.length}곳이 있어요.</p><button type="button" onClick={() => outside.forEach(place => trip.assignPlaceToDay(place.id, trip.travelStart))}>이 {outside.length}곳을 새 출발일로 옮기기</button><small>날짜별 배치는 다음 화면에서 바꿀 수 있어요.</small></div>}
      <button className="reference-primary" type="button" onClick={trip.saved.length ? onContinue : onPreferences}>{trip.saved.length ? c("다음: 일정 만들기", "Next: Itinerary") : c("여행 조건으로 돌아가기", "Back to trip preferences")}</button></aside>
  </div>;
}
