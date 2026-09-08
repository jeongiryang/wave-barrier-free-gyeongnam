import { Fragment } from "react";
import { transportModes } from "../constants";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import { useSitePreferences } from "../../../components/SitePreferences";
import { originalLanguage } from "../place-copy";
import { arrivalTime } from "../transport-time-copy";

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
    {transportContext && (transportContext.nearbyStops.length > 0 || transportContext.arrivals.length > 0 || transportContext.korail.length > 0) && <div className="transport-live-rail" aria-live="polite">
      <div><span>{english ? "Nearby stops" : "가까운 정류장"}</span><strong>{transportContext.nearbyStops.length ? transportContext.nearbyStops.slice(0, 3).map((item, index) => <Fragment key={item.id || index}>{index > 0 && " · "}<b lang={originalLanguage(item.name)}>{item.name}</b></Fragment>) : (english ? "Needs checking" : "확인 필요")}</strong></div>
      <div><span>{english ? "Bus arrivals" : "버스 도착"}</span><strong>{transportContext.arrivals.length ? transportContext.arrivals.slice(0, 3).map((item, index) => <Fragment key={index}>{index > 0 && " · "}<b lang={originalLanguage(item.route)}>{item.route}</b>{" "}{arrivalTime(item.minutes, english)}</Fragment>) : (english ? "Arrival information needs checking" : "도착정보 확인 필요")}</strong></div>
      <div><span>{english ? "Train plans" : "열차 운행계획"}</span><strong>{transportContext.korail.length ? (english ? "Timetable received" : "운행계획 수신") : (english ? "Timetable needs checking" : "운행계획 확인 필요")}</strong></div>
    </div>}
  </>;
}
