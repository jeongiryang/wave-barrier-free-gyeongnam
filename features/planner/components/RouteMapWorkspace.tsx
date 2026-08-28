import { useMemo } from "react";
import RouteMap from "../../../components/RouteMap";
import type { MapPlace } from "../../routing/types";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, PlanData } from "../types";
import RouteComparisonPanel from "./RouteComparisonPanel";
import TripPointPicker from "./TripPointPicker";

interface RouteMapWorkspaceProps {
  activePlaces: Place[];
  planCrowd: PlanData["crowd"];
  route: ReturnType<typeof useRoutePlanning>;
  locationSearch: ReturnType<typeof useLocationSearch>;
  onChoosePoint: (place: Place) => void;
  onMapDestination: (place: MapPlace) => void;
}

export default function RouteMapWorkspace({ activePlaces, planCrowd, route, locationSearch, onChoosePoint, onMapDestination }: RouteMapWorkspaceProps) {
  const { origin, originLabel, routeDestination, destinationCrowd, routeLoading, loadRoutes, updateOrigin, activeRoute } = route;
  const { pointPicker, setPointPicker } = locationSearch;
  const mapPlaces = useMemo(() => activePlaces.slice(0, 6), [activePlaces]);

  return <div className="navigation-workspace" data-reveal>
    <div className="map-panel">
      <div className="map-toolbar"><button type="button" className={pointPicker === "origin" ? "point-active" : "point-button"} onClick={() => setPointPicker((value) => value === "origin" ? null : "origin")}><span>출발 · 눌러서 변경</span><strong>{originLabel}</strong></button><i>→</i><button type="button" className={pointPicker === "destination" ? "point-active" : "point-button"} onClick={() => setPointPicker((value) => value === "destination" ? null : "destination")}><span>도착 · 눌러서 변경</span><strong>{routeDestination?.name || activePlaces[0]?.name || "여행지 선택 전"}</strong></button><button type="button" className="recalculate-button" onClick={() => activePlaces[0] && void loadRoutes(routeDestination || activePlaces[0])} disabled={!activePlaces.length || routeLoading}>{routeLoading ? "경로 확인 중" : "다시 계산"}</button></div>
      <TripPointPicker activePlaces={activePlaces} route={route} locationSearch={locationSearch} onChoosePoint={onChoosePoint} />
      <RouteMap origin={origin} places={mapPlaces} route={activeRoute} crowd={routeDestination ? destinationCrowd : planCrowd} crowdPlaceId={(routeDestination || activePlaces[0])?.id} onOriginChange={(point, label) => {
        updateOrigin(point, label, label === "현재 위치");
        if (label !== "현재 위치" && (routeDestination || activePlaces[0])) void loadRoutes(routeDestination || activePlaces[0], point, false, label);
      }} onDestinationChange={onMapDestination} />
      <div className="map-legend"><span><i className="origin" /> 출발지</span><span><i className="destination" /> 추천 여행지</span><span><i className={activeRoute?.configured ? "real" : "preview"} /> {activeRoute?.configured ? "실제 이동 구간" : "직선 미리보기"}</span></div>
    </div>
    <RouteComparisonPanel route={route} />
  </div>;
}
