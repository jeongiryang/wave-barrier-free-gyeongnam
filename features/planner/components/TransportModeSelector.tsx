import { lazy, Suspense } from "react";
import { transportModes } from "../constants";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import { useSitePreferences } from "../../../components/SitePreferences";

function SummaryUnavailable({ english }: { english: boolean }) {
  return <p className="transport-summary-note" role="alert">{english ? "The transport summary couldn't open. Open Transport details to review the received information." : "교통 요약을 불러오지 못했습니다. 교통정보 상세에서 받은 정보를 확인해 주세요."}</p>;
}
const TransportLiveSummary = lazy(() => import("./TransportLiveSummary").catch(() => ({ default: SummaryUnavailable })));

const englishModes: Record<string, [string, string]> = {
  all: ["All", "Transport information and booking"], car: ["Car", "Road routes and estimated times"],
  rail: ["Rail", "Timetables and service areas"], bus: ["Local bus", "Stops and arrival information"],
  regional: ["Regional bus", "Terminals and official booking"],
};

export default function TransportModeSelector({ route }: { route: ReturnType<typeof useRoutePlanning> }) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const { transportContext, transportMode, setTransportMode } = route;
  return <>
    <div className="transport-mode-filter" role="group" aria-label={english ? "Filter transport information" : "교통수단별 결과 필터"}>
      {transportModes.map((mode) => <button type="button" aria-pressed={transportMode === mode.id} key={mode.id} className={transportMode === mode.id ? "active" : ""} onClick={() => setTransportMode(mode.id)}><b>{english ? englishModes[mode.id][0] : mode.label}</b><small>{english ? englishModes[mode.id][1] : mode.description}</small></button>)}
    </div>
    {transportContext && (transportContext.nearbyStops.length > 0 || transportContext.arrivals.length > 0 || transportContext.korail.length > 0) && <Suspense fallback={<p className="transport-summary-note" role="status">{english ? "Opening transport summary…" : "교통 요약을 여는 중입니다…"}</p>}><TransportLiveSummary transportContext={transportContext} english={english} /></Suspense>}
  </>;
}
