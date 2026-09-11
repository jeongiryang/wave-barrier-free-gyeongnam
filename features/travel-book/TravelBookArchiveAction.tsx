"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useSitePreferences } from "../../components/SitePreferences";
import type { Place } from "../planner/types";
import { useTravelBook } from "./useTravelBook";
import CloudSaveAction from "../account-travel/CloudSaveAction";
import { createTravelBookSnapshot } from "../../lib/travel-book.js";

export default function TravelBookArchiveAction({ places, region, theme, profiles, travelStart, travelEnd, dayStartTime, scheduleAssignments, visitMinutesByPlaceId, fixedVisits, dayDeadlines, compact = false }: {
  compact?: boolean;
  places: Place[];
  region: string;
  theme: string;
  profiles: string[];
  travelStart: string;
  travelEnd: string;
  dayStartTime: string;
  scheduleAssignments: Record<string, string>;
  visitMinutesByPlaceId?: Record<string, number>;
  fixedVisits?: Record<string, import("../../lib/trip-time-constraints.js").FixedVisit>;
  dayDeadlines?: Record<string, import("../../lib/trip-time-constraints.js").DayDeadline>;
}) {
  const { locale } = useSitePreferences();
  const noticeId = useId();
  const c = (ko: string, en: string) => locale === "en" ? en : ko;
  const { hydrated, archive } = useTravelBook();
  const [saved, setSaved] = useState<boolean | null>(null);
  const accountBook = createTravelBookSnapshot({ places, region, theme, profiles, travelStart, travelEnd, dayStartTime, scheduleAssignments, visitMinutesByPlaceId, fixedVisits, dayDeadlines });
  const outsideDates = places.some(place => scheduleAssignments[place.id] && (scheduleAssignments[place.id] < travelStart || scheduleAssignments[place.id] > travelEnd));
  const notice = saved === null ? "" : saved ? c("내 일정에 저장했어요. 같은 일정을 다시 저장하면 최신 순서로 바뀝니다.", "Itinerary saved. Saving it again updates its order.") : c("저장할 일정을 확인해 주세요.", "Please check the itinerary to save.");

  return <div className={`travel-book-archive-action${compact ? " reference-archive" : ""}`}>
      <div hidden={compact}>
      <span>{c("내 일정 저장", "Save itinerary")}</span>
      <strong>{c("이 여행을 내 일정에 저장할까요?", "Keep this itinerary for later?")}</strong>
      <p>{c("완성한 일정을 보관하고, 다녀온 뒤에는 메모와 후기로 여행을 이어가세요.", "Keep your itinerary and continue the journey with notes and stories after your trip.")}</p>
    </div>
    <div className="travel-book-archive-controls">
      <button type="button" disabled={!hydrated || !places.length || outsideDates} aria-describedby={noticeId} onClick={() => {
        const snapshot = archive({
          region,
          theme,
          profiles,
          travelStart,
          travelEnd,
          dayStartTime,
          scheduleAssignments,
          visitMinutesByPlaceId, fixedVisits, dayDeadlines,
          places,
        });
        setSaved(Boolean(snapshot));
      }}>{c("내 일정에 저장", "Save itinerary")}</button>
      <Link href="/travel-book">{c("저장한 일정 보기", "View saved itineraries")} <span aria-hidden="true">→</span></Link>
    </div>
    <p id={noticeId}>{outsideDates ? c("기간 밖 장소의 날짜를 선택하거나 일정에서 제외한 뒤 저장해 주세요. 원래 날짜는 자동으로 옮기지 않습니다.", "Choose dates for places outside this period or remove them before saving. Their original dates will not be moved automatically.") : ""}</p>
    <small role="status" aria-live="polite">{notice}</small>
    {locale === "ko" && accountBook && <CloudSaveAction book={accountBook} />}
  </div>;
}
