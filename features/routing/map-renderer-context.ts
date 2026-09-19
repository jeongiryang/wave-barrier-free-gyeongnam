import type { Dispatch, SetStateAction } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { KakaoDrawingManager, KakaoMap } from "./kakao-sdk";
import type { describeCrowd } from "./map-utils";
import type { FacilityMapMarker, MapPickMode, MapPlace, MapProvider, RouteAlternative, RoutePoint } from "./types";

export type MutableRef<T> = { current: T };

export type MapRenderContent = Pick<MapRendererContext, "origin" | "places" | "route" | "crowdVisual" | "crowdPlace" | "facilityMarkers">;
export type MapContentController = { update(content: MapRenderContent): void; dispose(): void };

export function mapContentKey({ places, route, crowdVisual, crowdPlace, facilityMarkers }: MapRenderContent) {
  return JSON.stringify([
    places.map(({ id, name, image, mapX, mapY }) => [id, name, image, mapX, mapY]),
    route?.configured,
    route?.geometry,
    crowdVisual,
    crowdPlace?.id,
    // 편의 레이어를 켜고 끌 때만 다시 그린다. 같은 마커 집합이면 재그리기하지
    // 않아야 초점과 선택이 흔들리지 않는다.
    (facilityMarkers || []).map(({ id, layerId, name, destination }) => [id, layerId, name, destination.latitude, destination.longitude]),
  ]);
}

export function mapMarkerState(canvas: HTMLElement) {
  const focused = canvas.ownerDocument?.activeElement;
  const inside = Boolean(focused && canvas.contains(focused));
  return {
    focusedId: inside ? (focused as HTMLElement).dataset?.placeId : undefined,
    // 편의 마커도 재그리기 뒤 같은 버튼으로 초점을 되돌린다.
    focusedFacilityId: inside ? (focused as HTMLElement).dataset?.facilityMarkerId : undefined,
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
  if (!state.focusedFacilityId) return;
  canvas.querySelector<HTMLElement>(`[data-facility-marker-id="${CSS.escape(state.focusedFacilityId)}"]`)?.focus({ preventScroll: true });
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
  /** 켜진 편의 레이어의 마커. 이미 60개 상한이 적용된 목록이다. */
  facilityMarkers?: FacilityMapMarker[];
  chooseFacilityMarker?: (marker: FacilityMapMarker) => void;
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
