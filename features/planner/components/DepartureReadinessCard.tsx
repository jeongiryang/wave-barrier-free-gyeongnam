"use client";

import { useState } from "react";
import { assessDepartureReadiness } from "../../../lib/departure-assessment.js";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { PlanData, TransportProvider, WeatherData } from "../types";
import { localDate } from "../utils";
import { sameOriginHttpUrl } from "../../../lib/security/same-origin-url.js";
import { useSitePreferences } from "../../../components/SitePreferences";
import { regionNames } from "../../../components/GyeongnamRegionPicker";
import { originalLanguage } from "../place-copy";
import { useReadinessFocus } from "../hooks/useReadinessFocus";

interface DepartureReadinessCardProps {
  region: string;
  plan: PlanData | null;
  destinationCrowd?: PlanData["crowd"];
  destinationPlaceId?: string;
  weather: WeatherData | null;
  weatherLoading: boolean;
  transportProviders: TransportProvider[];
  tripSelection: ReturnType<typeof useTripSelection>;
  participation: ReturnType<typeof usePlannerParticipation>;
  onRefresh: () => void | Promise<void>;
  onOpenSignals: () => void;
}

const koreanStatus = {
  confirmed: "확인됨",
  partial: "일부 확인",
  recheck: "재확인 필요",
} as const;

function formatCheckedAt(value: string, en: boolean) {
  if (!value) return en ? "Checked time not provided" : "조회 시각 미제공";
  const compactDate = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (compactDate) return en ? `As of ${compactDate[1]}-${compactDate[2]}-${compactDate[3]}` : `${compactDate[1]}.${compactDate[2]}.${compactDate[3]} 기준`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return en ? `As of ${value}` : `${value} 기준`;
  const formatted = new Intl.DateTimeFormat(en ? "en-GB" : "ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
  return en ? `Checked ${formatted} KST` : `${formatted} 확인`;
}

export default function DepartureReadinessCard({
  region, plan, destinationCrowd, destinationPlaceId, weather, weatherLoading, transportProviders, tripSelection, participation, onRefresh, onOpenSignals,
}: DepartureReadinessCardProps) {
  const { locale } = useSitePreferences();
  const focusVisibility = useReadinessFocus();
  const en = locale === "en";
  const displayRegion = en ? regionNames[region] || region : region;
  const statusLabel = en ? { confirmed: "Checked", partial: "Partly checked", recheck: "Recheck needed" } : koreanStatus;
  const { travelStart, travelEnd, dayStartTime, orderedSavedPlaces, scheduleAssignments } = tripSelection;
  const [refreshing, setRefreshing] = useState(false);
  const [calendarState, setCalendarState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const assessment = assessDepartureReadiness({
    locale,
    travelStart,
    today: localDate(),
    weather,
    weatherLoading,
    crowd: destinationCrowd || plan?.crowd,
    crowdPlaceId: destinationCrowd ? destinationPlaceId : undefined,
    scheduleAssignments,
    generatedAt: plan?.generatedAt,
    transportProviders,
    places: orderedSavedPlaces,
  });
  const calendarDisabled = !orderedSavedPlaces.length || assessment.phase.id === "past";

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  async function downloadCalendar() {
    if (calendarDisabled || calendarState === "saving") return;
    setCalendarState("saving");
    try {
      const rawShareUrl = await participation.ensureShareUrl();
      const shareUrl = sameOriginHttpUrl(rawShareUrl, window.location.origin);
      if (!shareUrl) throw new Error("공유 링크를 확인하지 못했습니다.");
      const { buildTripCalendarIcs } = await import("../../../lib/trip-calendar.js");
      const contents = buildTripCalendarIcs({
        locale,
        travelStart,
        travelEnd,
        dayStartTime,
        title: en ? `W.A.V.E ${displayRegion} accessible trip` : `W.A.V.E ${region} 무장애 여행`,
        region: displayRegion,
        placeNames: orderedSavedPlaces.map((place) => place.name),
        shareUrl,
      });
      const downloadUrl = URL.createObjectURL(new Blob([contents], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `wave-${region}-${travelStart}.ics`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
      setCalendarState("done");
    } catch {
      setCalendarState("error");
    }
  }

  return <section {...focusVisibility} className={`departure-readiness ${assessment.state}`} id="departure-readiness" aria-labelledby="departure-readiness-title" data-reveal>
    <header>
      <div>
        <span><b aria-hidden="true">4</b> {en ? "Before leaving" : "출발 전 확인"} · {assessment.phase.label}</span>
        <h2 id="departure-readiness-title" aria-label={en ? "Check these details before leaving." : "출발 전에 이것만 다시 확인하세요."}><small>{en ? "Check these details before leaving." : "출발 전에 이것만 다시 확인하세요."}</small><span aria-hidden="true">{en ? "What should I check before leaving?" : "출발 전, 무엇을 확인할까요?"}</span></h2>
        <p>{en ? "Only retrieved information is marked as checked. Recheck the remaining details before leaving." : "실제로 조회된 정보만 ‘확인됨’으로 표시합니다. 나머지는 출발 전에 최신 정보를 확인하세요."}</p>
        {en && <p>Place names, source names and weather descriptions are shown in their original language.</p>}
      </div>
      <strong className={`readiness-overall ${assessment.state}`}><i aria-hidden="true" />{en ? "Overall: " : "전체 "}{statusLabel[assessment.state]}</strong>
    </header>
    <div className="readiness-grid">
      {assessment.items.map((item) => <article className={item.state} key={item.id}>
        <div><span>{item.label}</span><strong><i aria-hidden="true" />{statusLabel[item.state]}</strong></div>
        <p>{item.subject && <><span lang={originalLanguage(item.subject)}>{item.subject}</span>{" · "}</>}{item.summary}</p>
        <dl><div><dt>{en ? "Source" : "출처"}</dt><dd lang={en ? originalLanguage(item.source) : undefined}>{item.source}</dd></div><div><dt>{en ? "Time" : "시각"}</dt><dd>{formatCheckedAt(item.checkedAt, en)}</dd></div></dl>
        <a href={item.href} onClick={(event) => {
          if (item.href === "#layers" && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
            event.preventDefault();
            onOpenSignals();
          }
        }}>{item.state === "confirmed" ? en ? "Review evidence" : "근거 다시 보기" : en ? "Check now" : "바로 확인하기"} <span aria-hidden="true">→</span></a>
      </article>)}
    </div>
    <footer>
      <div>
        <strong>{assessment.phase.id === "past" ? en ? "Replan past trips using current information." : "지난 일정은 현재 정보로 다시 설계해 주세요." : en ? "The calendar includes a reminder to recheck before leaving." : "캘린더에도 출발 전 재확인 안내를 넣습니다."}</strong>
        <p>{orderedSavedPlaces.length ? en ? `Departure ${travelStart} ${dayStartTime} KST · ${orderedSavedPlaces.length} places · Shared itinerary link included` : `${travelStart} ${dayStartTime} 출발 · ${orderedSavedPlaces.length}곳 · 공유 일정 URL 포함` : en ? "Add places to your itinerary to create a shared trip and calendar." : "먼저 장소를 일정에 추가하면 공유 일정과 캘린더를 만들 수 있습니다."}</p>
        <span className="sr-only" role="status" aria-live="polite">{calendarState === "done" ? en ? "Calendar file saved." : "캘린더 파일을 저장했습니다." : calendarState === "error" ? en ? "Could not create the shared link or calendar file." : "공유 링크 또는 캘린더 파일을 만들지 못했습니다." : ""}</span>
      </div>
      <div className="readiness-actions">
        <button type="button" className="secondary" onClick={() => void refresh()} aria-disabled={refreshing} aria-busy={refreshing}>{refreshing ? en ? "Checking latest information" : "최신 정보 확인 중" : en ? "Check latest information" : "최신 정보 확인"}</button>
        <button type="button" onClick={() => void downloadCalendar()} disabled={calendarDisabled} aria-disabled={calendarDisabled || calendarState === "saving"} aria-busy={calendarState === "saving"}>{calendarState === "saving" ? en ? "Preparing calendar" : "캘린더 준비 중" : calendarState === "done" ? en ? "Save calendar again" : "캘린더 다시 저장" : en ? "Save calendar (.ics)" : "캘린더(.ics) 저장"}</button>
      </div>
      {calendarState === "error" && <p className="readiness-error" role="alert">{en ? "The shared link could not be created, so the calendar was not saved. Please try again shortly." : "공유 링크를 만들지 못해 캘린더를 저장하지 않았습니다. 잠시 뒤 다시 시도해 주세요."}</p>}
    </footer>
  </section>;
}
