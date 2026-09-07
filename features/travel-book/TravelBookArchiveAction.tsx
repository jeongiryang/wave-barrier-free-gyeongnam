"use client";

import Link from "next/link";
import { useState } from "react";
import { useSitePreferences } from "../../components/SitePreferences";
import type { Place } from "../planner/types";
import { useTravelBook } from "./useTravelBook";

export default function TravelBookArchiveAction({ places, region, theme, profiles, travelStart, travelEnd, dayStartTime, scheduleAssignments }: {
  places: Place[];
  region: string;
  theme: string;
  profiles: string[];
  travelStart: string;
  travelEnd: string;
  dayStartTime: string;
  scheduleAssignments: Record<string, string>;
}) {
  const { locale } = useSitePreferences();
  const c = (ko: string, en: string) => locale === "en" ? en : ko;
  const { hydrated, archive } = useTravelBook();
  const [saved, setSaved] = useState<boolean | null>(null);
  const outsideDates = places.some(place => scheduleAssignments[place.id] && (scheduleAssignments[place.id] < travelStart || scheduleAssignments[place.id] > travelEnd));
  const notice = saved === null ? "" : saved ? c("내 일정에 저장했어요. 같은 일정을 다시 저장하면 최신 순서로 바뀝니다.", "Saved on this device. Saving the same itinerary again updates its order.") : c("저장할 일정을 확인해 주세요.", "Please check the itinerary to save.");

  return <div className="travel-book-archive-action">
    <div>
      <span>{c("내 일정 저장", "Save on this device")}</span>
      <strong>{c("이 여행을 내 일정에 저장할까요?", "Keep this itinerary for later?")}</strong>
      <p>{c("일정과 공식 관광지 표지만 이 기기에 보관합니다. 계정·공유 링크 없이 다녀온 뒤 기록으로 이어갈 수 있어요.", "The itinerary and official place cover are kept on this device. No account or shared link is needed to continue your journal later.")}</p>
    </div>
    <div className="travel-book-archive-controls">
      <button type="button" disabled={!hydrated || !places.length || outsideDates} aria-describedby="archive-date-notice" onClick={() => {
        const snapshot = archive({
          title: `${region} ${places.length}곳 여행`,
          region,
          theme,
          profiles,
          travelStart,
          travelEnd,
          dayStartTime,
          scheduleAssignments,
          places,
        });
        setSaved(Boolean(snapshot));
      }}>{c("내 일정에 저장", "Save itinerary")}</button>
      <Link href="/travel-book">{c("저장한 일정 보기", "View saved itineraries")} <span aria-hidden="true">→</span></Link>
    </div>
    <p id="archive-date-notice">{outsideDates ? c("기간 밖 장소의 날짜를 선택하거나 일정에서 제외한 뒤 저장해 주세요. 원래 날짜는 자동으로 옮기지 않습니다.", "Choose dates for places outside this period or remove them before saving. Their original dates will not be moved automatically.") : ""}</p>
    <small role="status" aria-live="polite">{notice}</small>
  </div>;
}
