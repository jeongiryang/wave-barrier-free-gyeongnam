import { lazy, Suspense, useCallback, useMemo, useRef } from "react";
import type { MapPlace } from "../../routing/types";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, PlanData } from "../types";
import RouteComparisonPanel from "./RouteComparisonPanel";
import TripPointPicker from "./TripPointPicker";

interface RouteMapWorkspaceProps {
  mapEnabled: boolean;
  activePlaces: Place[];
  planCrowd: PlanData["crowd"];
  route: ReturnType<typeof useRoutePlanning>;
  locationSearch: ReturnType<typeof useLocationSearch>;
  onChoosePoint: (place: Place) => void;
  onMapDestination: (place: MapPlace) => void;
  onSaveMapPlaces: (places: MapPlace[]) => number;
}

const DeferredRouteMap = lazy(() => import("../../../components/RouteMap"));

export default function RouteMapWorkspace({ mapEnabled, activePlaces, planCrowd, route, locationSearch, onChoosePoint, onMapDestination, onSaveMapPlaces }: RouteMapWorkspaceProps) {
  const { origin, originLabel, routeDestination, destinationCrowd, routeLoading, loadRoutes, updateOrigin, activeRoute } = route;
  const { pointPicker, setPointPicker } = locationSearch;
  const mapPlaces = useMemo(() => activePlaces.slice(0, 6), [activePlaces]);
  const pointPickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const togglePointPicker = useCallback((value: "origin" | "destination", trigger: HTMLButtonElement) => {
    pointPickerTriggerRef.current = trigger;
    setPointPicker((current) => current === value ? null : value);
  }, [setPointPicker]);
  const closePointPicker = useCallback(() => {
    setPointPicker(null);
    window.requestAnimationFrame(() => pointPickerTriggerRef.current?.focus());
  }, [setPointPicker]);

  return <div className="navigation-workspace" data-reveal>
    <div className="map-panel">
      <div className="map-toolbar"><button type="button" aria-expanded={pointPicker === "origin"} aria-controls="trip-point-picker" className={pointPicker === "origin" ? "point-active" : "point-button"} onClick={(event) => togglePointPicker("origin", event.currentTarget)}><span>출발 · 눌러서 변경</span><strong>{originLabel}</strong></button><i aria-hidden="true">→</i><button type="button" aria-expanded={pointPicker === "destination"} aria-controls="trip-point-picker" className={pointPicker === "destination" ? "point-active" : "point-button"} onClick={(event) => togglePointPicker("destination", event.currentTarget)}><span>도착 · 눌러서 변경</span><strong>{routeDestination?.name || activePlaces[0]?.name || "여행지 선택 전"}</strong></button><button type="button" className="recalculate-button" onClick={() => activePlaces[0] && void loadRoutes(routeDestination || activePlaces[0])} disabled={!activePlaces.length || routeLoading}>{routeLoading ? "경로 확인 중" : "다시 계산"}</button></div>
      <TripPointPicker activePlaces={activePlaces} route={route} locationSearch={locationSearch} onChoosePoint={onChoosePoint} onClose={closePointPicker} />
      {mapEnabled ? <Suspense fallback={<div className="map-load-placeholder" role="status">대화형 지도를 준비하고 있습니다.</div>}>
        <DeferredRouteMap origin={origin} places={mapPlaces} route={activeRoute} crowd={routeDestination ? destinationCrowd : planCrowd} crowdPlaceId={(routeDestination || activePlaces[0])?.id} onOriginChange={(point, label) => {
          updateOrigin(point, label, label === "현재 위치");
          if (label !== "현재 위치" && (routeDestination || activePlaces[0])) void loadRoutes(routeDestination || activePlaces[0], point, false, label);
        }} onDestinationChange={onMapDestination} onSavePlaces={onSaveMapPlaces} />
      </Suspense> : <div className="map-load-placeholder" role="status">일정과 이동 단계에서 대화형 지도를 불러옵니다.</div>}
      <div className="map-legend"><span><i className="origin" /> 출발지</span><span><i className="destination" /> 추천 여행지</span><span><i className={activeRoute?.configured ? "real" : "preview"} /> {activeRoute?.configured ? "실제 이동 구간" : "직선 미리보기"}</span></div>
    </div>
    <RouteComparisonPanel route={route} />
  </div>;
}
