"use client";

import { useSitePreferences } from "../../../components/SitePreferences";
import { usableLegRoutes } from "../../../lib/itinerary-legs.js";
import type { useItineraryRoutes } from "../hooks/useItineraryRoutes";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { useTripSelection } from "../hooks/useTripSelection";

export default function ItineraryRouteCoverage({ coverage, route, trip, reviewed, onReview }: {
  coverage: ReturnType<typeof useItineraryRoutes>;
  route: ReturnType<typeof useRoutePlanning>;
  trip: ReturnType<typeof useTripSelection>;
  reviewed: boolean;
  onReview: (checked: boolean) => void;
}) {
  const { locale } = useSitePreferences();
  const en = locale === "en";
  if (!coverage.legs.length) return null;
  return <section className="itinerary-route-coverage" aria-labelledby="route-coverage-title">
    <h3 id="route-coverage-title">{en ? "Check every journey" : "일정의 모든 이동 구간 확인"}</h3>
    <p>{en ? "Each day starts from the departure point shown below. Review your actual starting point. Route availability does not confirm wheelchair access, slopes, low-floor buses or working lifts." : "각 날짜는 아래 출발 거점에서 시작합니다. 실제 출발지와 맞는지 먼저 확인하세요. 경로가 있어도 휠체어 통행, 경사, 저상버스나 승강기 운행을 보장하지 않습니다."}</p>
    <p><strong>{en ? "Daily starting point" : "하루 출발 거점"}: {route.originLabel}</strong></p>
    <label>{en ? "Transport" : "이동수단"}<select value={route.routeTravelMode} onChange={(event) => route.setRouteTravelMode(event.target.value as typeof route.routeTravelMode)}>
      <option value="car">{en ? "Car" : "자동차"}</option><option value="transit">{en ? "Public transport" : "대중교통"}</option><option value="walk">{en ? "Walking — external check" : "도보 — 외부 지도 확인"}</option><option value="bicycle">{en ? "Cycling — external check" : "자전거 — 외부 지도 확인"}</option>
    </select></label>
    <div className="coverage-actions"><button type="button" onClick={() => void coverage.checkRoutes()} disabled={coverage.loading}>{coverage.loading ? (en ? "Checking…" : "구간 확인 중…") : (en ? "Check all journeys" : "모든 구간 조회하기")}</button>{coverage.loading && <button type="button" onClick={coverage.cancel}>{en ? "Cancel" : "확인 중단"}</button>}</div>
    <p role="status">{en ? `${coverage.readyCount} of ${coverage.legs.length} journeys found for this transport` : `선택한 이동수단: 전체 ${coverage.legs.length}구간 중 ${coverage.readyCount}구간 확인`}</p>
    <ol>{coverage.legs.map((leg) => {
      const best = usableLegRoutes(coverage.data[leg.key], route.routeTravelMode)[0];
      const unavailable = leg.blocked ? (en ? "Device location is not sent. Choose a public departure point." : "현재 위치는 전송하지 않습니다. 공개 출발 거점을 선택하세요.") : !leg.from || !leg.to ? (en ? "Coordinates unavailable" : "좌표 미확인") : (en ? "Not verified — retry or check with the operator" : "미확인 — 재조회하거나 운영기관에 확인하세요");
      return <li key={leg.key}><span>{leg.day} · {leg.fromLabel} → {leg.place.name}</span><strong>{best ? `${best.totalTime}${en ? " min" : "분"} · ${best.provider || (en ? "Route provider" : "경로 제공처")}` : unavailable}</strong>{best && <button type="button" onClick={() => {
        trip.setActiveDay(leg.day);
        route.displayRouteData(leg.place, leg.from!, leg.fromLabel, coverage.data[leg.key]);
        route.setActiveRouteId(best.id);
        document.getElementById("navigation")?.scrollIntoView({ block: "start" });
      }}>{en ? "Show this journey" : "이 구간 지도에서 보기"}</button>}</li>;
    })}</ol>
    {coverage.notice && <p>{en ? (coverage.loading ? "Fetching route information. You can cancel." : "Recheck any unavailable journeys before leaving.") : coverage.notice}</p>}
    <label className="departure-review-check"><input type="checkbox" checked={reviewed} disabled={!coverage.complete || coverage.loading} onChange={(event) => onReview(event.target.checked)} />{en ? "I checked the dates, order, starting point and each journey for this transport. Facility access still needs a separate check." : "날짜·순서·출발지와 선택한 이동수단의 각 구간을 확인했어요. 시설 접근성은 별도로 확인해야 합니다."}</label>
  </section>;
}
