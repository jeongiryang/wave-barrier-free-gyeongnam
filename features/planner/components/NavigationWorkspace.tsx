import type { MapPlace } from "../../routing/types";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, PlanData, TransportProvider } from "../types";
import RouteMapWorkspace from "./RouteMapWorkspace";
import TransportDataOverview from "./TransportDataOverview";

interface NavigationWorkspaceProps {
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
  return <section className="navigation-section" id="navigation">
    <div className="workspace-heading" data-reveal>
      <div><span aria-hidden="true">↗</span><h3>이동 경로 확인</h3></div>
      <p>출발지와 도착지를 고르면 실제로 확인된 시간, 환승과 도보 구간을 비교합니다.</p>
    </div>
    <TransportDataOverview
      activePlaces={activePlaces}
      effectiveProviders={effectiveProviders}
      route={route}
      onCopyBookingRoute={onCopyBookingRoute}
    />
    <RouteMapWorkspace
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
