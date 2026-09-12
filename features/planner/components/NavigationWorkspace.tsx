import type { MapPlace } from "../../routing/types";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, PlanData, TransportProvider } from "../types";
import RouteMapWorkspace from "./RouteMapWorkspace";
import TransportDataOverview from "./TransportDataOverview";
import { useSitePreferences } from "../../../components/SitePreferences";

interface NavigationWorkspaceProps {
  compact?: boolean;
  focusedPlaceId?: string;
  onPlaceFocus?: (place: MapPlace) => void;
  mapEnabled: boolean;
  activePlaces: Place[];
  planCrowd: PlanData["crowd"];
  effectiveProviders: TransportProvider[];
  route: ReturnType<typeof useRoutePlanning>;
  locationSearch: ReturnType<typeof useLocationSearch>;
  onChoosePoint: (place: Place) => void;
  onCopyBookingRoute: (provider: string) => Promise<void>;
  onMapDestination: (place: MapPlace) => void;
  onSaveMapPlaces: (places: MapPlace[]) => number;
}

export default function NavigationWorkspace({
  focusedPlaceId, onPlaceFocus,
  compact = false,
  mapEnabled,
  activePlaces,
  planCrowd,
  effectiveProviders,
  route,
  locationSearch,
  onChoosePoint,
  onCopyBookingRoute,
  onMapDestination,
  onSaveMapPlaces,
}: NavigationWorkspaceProps) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  return <section className="navigation-section" id="navigation" aria-labelledby="navigation-title">
    <div className="workspace-heading" data-reveal>
      <div><span aria-hidden="true">↗</span><h3 id="navigation-title">{english ? "Check your route" : "이동 경로 확인"}</h3></div>
      <p>{english ? "Choose departure and destination to compare available journey times, transfers and walking sections." : "출발지와 도착지를 고르면 실제로 확인된 시간, 환승과 도보 구간을 비교합니다."}</p>
    </div>
    <details className="reference-transport-details" open={compact ? undefined : true}><summary>상세 교통수단 보기</summary><TransportDataOverview
      activePlaces={activePlaces}
      effectiveProviders={effectiveProviders}
      route={route}
      onCopyBookingRoute={onCopyBookingRoute}
    /></details>
    <RouteMapWorkspace focusedPlaceId={focusedPlaceId} onPlaceFocus={onPlaceFocus}
      compact={compact}
      mapEnabled={mapEnabled}
      activePlaces={activePlaces}
      planCrowd={planCrowd}
      route={route}
      locationSearch={locationSearch}
      onChoosePoint={onChoosePoint}
      onMapDestination={onMapDestination}
      onSaveMapPlaces={onSaveMapPlaces}
    />
  </section>;
}
