import NightIcon from "../../../components/NightIcon";
import { Spinner } from "../../../components/LoadingState";
import { lazy, Suspense, useCallback, useRef, useState } from "react";
import type { MapPlace, RouteAlternative } from "../../routing/types";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, PlanData } from "../types";
import RouteComparisonPanel from "./RouteComparisonPanel";
import TripPointPicker from "./TripPointPicker";
import { useSitePreferences } from "../../../components/SitePreferences";
import { originalLanguage } from "../place-copy";

interface RouteMapWorkspaceProps {
  compact?: boolean;
  itineraryRoutes?: RouteAlternative[];
  focusedPlaceId?: string;
  onPlaceFocus?: (place: MapPlace) => void;
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

export default function RouteMapWorkspace({ focusedPlaceId, onPlaceFocus, itineraryRoutes, compact = false, mapEnabled, activePlaces, planCrowd, route, locationSearch, onChoosePoint, onMapDestination, onSaveMapPlaces }: RouteMapWorkspaceProps) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const { origin, originLabel, routeDestination, destinationCrowd, routeLoading, loadRoutes, updateOrigin, activeRoute } = route;
  const displayOrigin = route.routeStart || origin;
  const displayOriginLabel = route.routeStartLabel || originLabel;
  const { pointPicker, setPointPicker } = locationSearch;
  // Load only after the map is first requested, then retain its choices across
  // search/itinerary and mobile timeline/map switches.
  const [mapMounted, setMapMounted] = useState(mapEnabled);
  if (mapEnabled && !mapMounted) setMapMounted(true);
  const [mapPlaces, setMapPlaces] = useState(activePlaces);
  // Switching search language can resolve the same saved place objects into a
  // new array. Keep the map when its places and their order are unchanged.
  if (mapPlaces.length !== activePlaces.length || mapPlaces.some((place, index) => place !== activePlaces[index])) setMapPlaces(activePlaces);
  const pointPickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const recalculateRef = useRef(false);
  const recalculate = async () => {
    if (recalculateRef.current || routeLoading || !activePlaces[0]) return;
    recalculateRef.current = true;
    try { await loadRoutes(routeDestination || activePlaces[0], displayOrigin, route.routeStart ? route.routeStartIsPrivate : route.privateOrigin, displayOriginLabel); }
    finally { recalculateRef.current = false; }
  };
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
      <div className="map-travel-modes" role="group" aria-label={english ? 'Travel mode' : '지도 이동수단'}>
        {(['transit','car','walk','bicycle'] as const).map(mode => <button key={mode} type="button" aria-pressed={route.routeTravelMode === mode} title={{transit:'대중교통',car:'자동차',walk:'도보',bicycle:'자전거'}[mode]} onClick={() => route.setRouteTravelMode(mode)}><NightIcon name={mode === 'transit' ? 'bus' : mode} size={20}/><span>{{transit:'대중교통',car:'자동차',walk:'도보',bicycle:'자전거'}[mode]}</span>{route.routeTravelMode === mode && activeRoute && <small>{activeRoute.totalTime}분</small>}</button>)}
      </div>
      <div className="map-toolbar"><button type="button" aria-expanded={pointPicker === "origin"} aria-controls="trip-point-picker" className={pointPicker === "origin" ? "point-active" : "point-button"} onClick={(event) => togglePointPicker("origin", event.currentTarget)}><span>{english ? "Change departure" : "출발지"}</span><strong lang={originalLanguage(displayOriginLabel)}>{displayOriginLabel}</strong></button><i aria-hidden="true"></i><button type="button" aria-expanded={pointPicker === "destination"} aria-controls="trip-point-picker" className={pointPicker === "destination" ? "point-active" : "point-button"} onClick={(event) => togglePointPicker("destination", event.currentTarget)}><span>{english ? "Change destination" : "도착지"}</span><strong lang={originalLanguage(routeDestination?.name || activePlaces[0]?.name || "")}>{routeDestination?.name || activePlaces[0]?.name || (english ? "No destination yet" : "여행지 선택 전")}</strong></button><button type="button" className="recalculate-button" data-icon-action="" title={english ? "Recalculate" : "다시 계산"} aria-label={routeLoading ? (english ? "Checking route" : "경로 확인 중") : (english ? "Recalculate" : "다시 계산")} onClick={() => void recalculate()} disabled={!activePlaces.length} aria-disabled={routeLoading || undefined} aria-busy={routeLoading || undefined}><NightIcon name="refresh"/></button></div>
      <TripPointPicker activePlaces={activePlaces} route={route} locationSearch={locationSearch} onChoosePoint={onChoosePoint} onClose={closePointPicker} />
      {mapMounted ? <Suspense fallback={<div className="map-load-placeholder" role="status"><span><Spinner />{english ? "Preparing the interactive map." : "대화형 지도를 준비하고 있습니다."}</span></div>}>
        <DeferredRouteMap itineraryRoutes={itineraryRoutes} focusedPlaceId={focusedPlaceId} onPlaceFocus={onPlaceFocus} origin={displayOrigin} originLabel={displayOriginLabel} places={mapPlaces} route={activeRoute} crowd={routeDestination ? destinationCrowd : planCrowd} crowdPlaceId={(routeDestination || activePlaces[0])?.id} onOriginChange={(point, label) => {
          updateOrigin(point, label, label === "현재 위치");
          if (label !== "현재 위치" && (routeDestination || activePlaces[0])) void loadRoutes(routeDestination || activePlaces[0], point, false, label);
        }} onDestinationChange={onMapDestination} onSavePlaces={onSaveMapPlaces} />
      </Suspense> : <div className="map-load-placeholder" role="status">{english ? "The interactive map loads in the itinerary and travel stage." : "일정과 이동 단계에서 대화형 지도를 불러옵니다."}</div>}
      <div className="map-legend"><span><i className="origin" /> {english ? "Departure" : "출발지"}</span><span><i className="destination" /> {english ? "Selected day's itinerary" : "선택 날짜의 일정"}</span><span><i className={activeRoute?.configured ? "real" : "preview"} /> {activeRoute?.provider === "ODsay" ? (english ? "Stop connections, not road geometry" : "정류장 연결 개요 · 실제 도로선 아님") : activeRoute?.configured ? (english ? "Verified road routes" : "조회된 도로 경로") : (english ? "Route unavailable" : "경로 미확인")}</span></div>
      <p className="route-scope-note" role="status">{routeLoading ? (english ? 'Checking routes…' : '경로를 확인하고 있어요…') : activeRoute ? (english ? 'Shortest travel time first · time shown for selected leg' : '소요 시간 짧은 순 · 선택 구간의 시간 표시') : (english ? 'No verified route for this mode. Check route details.' : '이 이동수단의 경로를 확인하지 못했어요. 아래 경로 비교에서 확인해 주세요.')}</p>
    </div>
    {compact ? <details className="reference-route-details"><summary>이동수단·경로 비교</summary><RouteComparisonPanel route={route} /></details> : <RouteComparisonPanel route={route} />}
  </div>;
}
