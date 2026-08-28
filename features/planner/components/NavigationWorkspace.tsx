import type { MapPlace } from "../../routing/types";
import type { useLocationSearch } from "../hooks/useLocationSearch";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, PlanData, TransportProvider } from "../types";
import RouteMapWorkspace from "./RouteMapWorkspace";
import TransportDataOverview from "./TransportDataOverview";

interface NavigationWorkspaceProps {
  t: (key: string, fallback: string) => string;
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
  t,
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
      <div><span>02</span><h2>{t("navigationTitle", "이동수단별 길찾기")}</h2></div>
      <p>도보 · 자전거 · 대중교통 · 자동차 · 최소 시간순</p>
    </div>
    <TransportDataOverview
      activePlaces={activePlaces}
      effectiveProviders={effectiveProviders}
      route={route}
      onCopyBookingRoute={onCopyBookingRoute}
    />
    <RouteMapWorkspace
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
