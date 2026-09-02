"use client";

import { useMemo, useState } from "react";
import { assessDepartureReadiness, buildTripCalendarIcs } from "../../../lib/departure-readiness.js";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { useTripSelection } from "../hooks/useTripSelection";
import type { PlanData, TransportProvider, WeatherData } from "../types";
import { localDate } from "../utils";
import { sameOriginHttpUrl } from "../../../lib/security/same-origin-url.js";

interface DepartureReadinessCardProps {
  region: string;
  plan: PlanData | null;
  weather: WeatherData | null;
  weatherLoading: boolean;
  transportProviders: TransportProvider[];
  tripSelection: ReturnType<typeof useTripSelection>;
  participation: ReturnType<typeof usePlannerParticipation>;
  onRefresh: () => void | Promise<void>;
}

const statusLabel = {
  confirmed: "확인됨",
  partial: "일부 확인",
  recheck: "재확인 필요",
} as const;

function formatCheckedAt(value: string) {
  if (!value) return "조회 시각 미제공";
  const compactDate = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  if (compactDate) return `${compactDate[1]}.${compactDate[2]}.${compactDate[3]} 기준`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return `${value} 기준`;
  return `${new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date)} 확인`;
}

export default function DepartureReadinessCard({
  region, plan, weather, weatherLoading, transportProviders, tripSelection, participation, onRefresh,
}: DepartureReadinessCardProps) {
  const { travelStart, travelEnd, dayStartTime, orderedSavedPlaces } = tripSelection;
  const [refreshing, setRefreshing] = useState(false);
  const [calendarState, setCalendarState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const assessment = useMemo(() => assessDepartureReadiness({
    travelStart,
    today: localDate(),
    weather,
    weatherLoading,
    crowd: plan?.crowd,
    generatedAt: plan?.generatedAt,
    transportProviders,
    places: orderedSavedPlaces,
  }), [orderedSavedPlaces, plan?.crowd, plan?.generatedAt, transportProviders, travelStart, weather, weatherLoading]);
  const calendarDisabled = !plan || !orderedSavedPlaces.length || assessment.phase.id === "past" || calendarState === "saving";

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
    if (calendarDisabled) return;
    setCalendarState("saving");
    try {
      const rawShareUrl = await participation.ensureShareUrl();
      const shareUrl = sameOriginHttpUrl(rawShareUrl, window.location.origin);
      if (!shareUrl) throw new Error("공유 링크를 확인하지 못했습니다.");
      const contents = buildTripCalendarIcs({
        travelStart,
        travelEnd,
        dayStartTime,
        title: `W.A.V.E ${region} 무장애 여행`,
        region,
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

  return <section className={`departure-readiness ${assessment.state}`} id="departure-readiness" aria-labelledby="departure-readiness-title" data-reveal>
    <header>
      <div>
        <span><b aria-hidden="true">4</b> 출발 전 확인 · {assessment.phase.label}</span>
        <h2 id="departure-readiness-title" aria-label="출발 전에 이것만 다시 확인하세요."><small>출발 전에 이것만 다시 확인하세요.</small><span aria-hidden="true">지금 출발해도 괜찮을까요?</span></h2>
        <p>실제로 조회된 정보만 ‘확인됨’으로 표시합니다. 나머지는 출발 전에 최신 정보를 확인하세요.</p>
      </div>
      <strong className={`readiness-overall ${assessment.state}`}><i aria-hidden="true" />전체 {statusLabel[assessment.state as keyof typeof statusLabel]}</strong>
    </header>
    <div className="readiness-grid">
      {assessment.items.map((item) => <article className={item.state} key={item.id}>
        <div><span>{item.label}</span><strong><i aria-hidden="true" />{statusLabel[item.state as keyof typeof statusLabel]}</strong></div>
        <p>{item.summary}</p>
        <dl><div><dt>출처</dt><dd>{item.source}</dd></div><div><dt>시각</dt><dd>{formatCheckedAt(item.checkedAt)}</dd></div></dl>
        <a href={item.href}>{item.state === "confirmed" ? "근거 다시 보기" : "바로 확인하기"} <span aria-hidden="true">→</span></a>
      </article>)}
    </div>
    <footer>
      <div>
        <strong>{assessment.phase.id === "past" ? "지난 일정은 현재 정보로 다시 설계해 주세요." : "캘린더에도 출발 전 재확인 안내를 넣습니다."}</strong>
        <p>{orderedSavedPlaces.length ? `${travelStart} ${dayStartTime} 출발 · ${orderedSavedPlaces.length}곳 · 공유 일정 URL 포함` : "먼저 장소를 일정에 추가하면 공유 일정과 캘린더를 만들 수 있습니다."}</p>
        <span className="sr-only" role="status" aria-live="polite">{calendarState === "done" ? "캘린더 파일을 저장했습니다." : calendarState === "error" ? "공유 링크 또는 캘린더 파일을 만들지 못했습니다." : ""}</span>
      </div>
      <div className="readiness-actions">
        <button type="button" className="secondary" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? "최신 정보 확인 중" : "최신 정보 확인"}</button>
        <button type="button" onClick={() => void downloadCalendar()} disabled={calendarDisabled}>{calendarState === "saving" ? "캘린더 준비 중" : calendarState === "done" ? "캘린더 다시 저장" : "캘린더(.ics) 저장"}</button>
      </div>
      {calendarState === "error" && <p className="readiness-error" role="alert">공유 링크를 만들지 못해 캘린더를 저장하지 않았습니다. 잠시 뒤 다시 시도해 주세요.</p>}
    </footer>
  </section>;
}
