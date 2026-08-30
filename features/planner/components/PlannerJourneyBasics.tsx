import { departurePresets, regions } from "../constants";
import type { usePlannerPlan } from "../hooks/usePlannerPlan";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place } from "../types";

export default function PlannerJourneyBasics({ t, activePlaces, planController, route }: {
  t: (key: string, fallback: string) => string;
  activePlaces: Place[];
  planController: ReturnType<typeof usePlannerPlan>;
  route: ReturnType<typeof useRoutePlanning>;
}) {
  const { region, setRegion } = planController;
  const { originLabel, updateOrigin, requestCurrentLocation, loadRoutes } = route;
  return <>
    <div className="control-panel departure-control">
      <span className="step-label">{t("startFrom", "어디서 출발할까요?")}</span>
      <div className="departure-row">
        <div className="select-shell"><i aria-hidden="true">◎</i><select value={departurePresets.find((item) => item.name === originLabel)?.id || "current"} onChange={(event) => {
          const preset = departurePresets.find((item) => item.id === event.target.value);
          if (!preset) return;
          updateOrigin(preset.point, preset.name);
          if (activePlaces[0]) void loadRoutes(activePlaces[0], preset.point, false, preset.name);
        }} aria-label="출발 거점 선택"><option value="current" disabled>{originLabel === "현재 위치" ? "현재 위치" : "출발 거점 선택"}</option>{departurePresets.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.detail}</option>)}</select><small>출발</small></div>
        <button type="button" onClick={requestCurrentLocation}>{t("currentLocation", "현재 위치")}</button>
      </div>
    </div>
    <label className="control-panel region-control">
      <span className="step-label">{t("destination", "어디로 갈까요?")}</span>
      <div className="select-shell"><i aria-hidden="true">⌖</i><select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="여행 지역 선택">{regions.map((item) => <option key={item}>{item}</option>)}</select><small>법정동 시도 48</small></div>
    </label>
  </>;
}
