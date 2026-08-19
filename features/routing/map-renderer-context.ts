import type { Dispatch, SetStateAction } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { KakaoDrawingManager, KakaoMap } from "./kakao-sdk";
import type { describeCrowd } from "./map-utils";
import type { MapPickMode, MapPlace, MapProvider, RouteAlternative, RoutePoint } from "./types";

export type MutableRef<T> = { current: T };

export interface MapRendererContext {
  containerRef: MutableRef<HTMLDivElement | null>;
  mapRef: MutableRef<LeafletMap | null>;
  kakaoMapRef: MutableRef<KakaoMap | null>;
  drawingManagerRef: MutableRef<KakaoDrawingManager | null>;
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
  setProvider: Dispatch<SetStateAction<MapProvider>>;
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
