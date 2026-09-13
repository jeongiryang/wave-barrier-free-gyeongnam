import type { Dispatch, SetStateAction } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { KakaoDrawingManager, KakaoMap } from "./kakao-sdk";
import type { describeCrowd } from "./map-utils";
import type { MapPickMode, MapPlace, MapProvider, RouteAlternative, RoutePoint } from "./types";

export type MutableRef<T> = { current: T };

export type MapRenderContent = Pick<MapRendererContext, "origin" | "places" | "route" | "crowdVisual" | "crowdPlace">;
export type MapContentController = { update(content: MapRenderContent): void; dispose(): void };

export function mapContentKey({ places, route, crowdVisual, crowdPlace }: MapRenderContent) {
  return JSON.stringify([places.map(({ id, name, image, mapX, mapY }) => [id, name, image, mapX, mapY]), route?.configured, route?.geometry, crowdVisual, crowdPlace?.id]);
}

export function mapMarkerState(canvas: HTMLElement) {
  const focused = canvas.ownerDocument?.activeElement;
  return {
    focusedId: focused && canvas.contains(focused) ? (focused as HTMLElement).dataset?.placeId : undefined,
    selectedIds: new Set(Array.from(canvas.querySelectorAll<HTMLElement>('[data-place-id][aria-current="location"]'), marker => marker.dataset.placeId)),
  };
}

export function restoreMapMarkerState(canvas: HTMLElement, state: ReturnType<typeof mapMarkerState>) {
  for (const marker of canvas.querySelectorAll<HTMLElement>('[data-place-id]')) {
    if (state.selectedIds.has(marker.dataset.placeId)) {
      marker.classList.add('itinerary-focused');
      marker.setAttribute('aria-current', 'location');
    }
    if (marker.dataset.placeId === state.focusedId) marker.focus({ preventScroll: true });
  }
}

export interface MapRendererContext {
  containerRef: MutableRef<HTMLDivElement | null>;
  mapRef: MutableRef<LeafletMap | null>;
  kakaoMapRef: MutableRef<KakaoMap | null>;
  drawingManagerRef: MutableRef<KakaoDrawingManager | null>;
  fitMapRef: MutableRef<(() => void) | null>;
  origin: RoutePoint;
  places: MapPlace[];
  route: RouteAlternative | null;
  crowdVisual: ReturnType<typeof describeCrowd> | null;
  crowdPlace?: MapPlace;
  pickModeRef: MutableRef<MapPickMode>;
  roadviewSelectModeRef: MutableRef<boolean>;
  onOriginChangeRef: MutableRef<((point: RoutePoint, label: string) => void) | undefined>;
  onDestinationChangeRef: MutableRef<((place: MapPlace) => void) | undefined>;
  openRoadviewAt: (point: RoutePoint) => void;
  choosePlace: (place: MapPlace) => void;
  clearCategoryMarkers: () => void;
  setProvider: (provider: MapProvider) => void;
  setProviderDetail: Dispatch<SetStateAction<string>>;
  setSelectedMapPlace: Dispatch<SetStateAction<MapPlace | null>>;
  setPickMode: Dispatch<SetStateAction<MapPickMode>>;
  setRoadviewSelectMode: Dispatch<SetStateAction<boolean>>;
  setMeasureSummary: Dispatch<SetStateAction<string>>;
}

export function pickedDestination(point: RoutePoint): MapPlace {
  return {
    id: `map-${point.lat.toFixed(6)}-${point.lng.toFixed(6)}`,
    name: "지도에서 선택한 목적지",
    address: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
    mapX: String(point.lng),
    mapY: String(point.lat),
    score: null,
  };
}
