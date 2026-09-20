export type FacilityLayerMarker = {
  id: string;
  layerId: string;
  name: string;
  address: string;
  destination: { latitude: number; longitude: number };
  distanceMeters: number | null;
  /** 공식 데이터 레이어 전용. 제공처가 밝힌 데이터 기준일. */
  referenceDate?: string;
  /** 화면에 그대로 표시하는 제공처 이름. */
  source: string;
  detail?: string;
  institutionName?: string;
  note?: string;
  kind?: string;
  locationNote?: string;
};

export type FacilityLayerSelection = {
  /** 최대 FACILITY_LAYER_LIMIT 개. */
  active: string[];
  markers: Record<string, FacilityLayerMarker[]>;
  failed: string[];
};

export function emptyFacilitySelection(): FacilityLayerSelection;
/** 상한에 막히면 입력과 같은 배열 참조를 그대로 돌려준다. */
export function toggleFacilityLayer(active: string[], id: string, limit: number): string[];
export function mergeFacilityMarkers(
  selection: FacilityLayerSelection,
  layerId: string,
  markers: FacilityLayerMarker[],
): FacilityLayerSelection;
export function failFacilityLayer(selection: FacilityLayerSelection, layerId: string): FacilityLayerSelection;
export function clearFacilityLayer(selection: FacilityLayerSelection, layerId: string): FacilityLayerSelection;
export function visibleFacilityMarkers(selection: FacilityLayerSelection, cap: number): FacilityLayerMarker[];
export function hiddenFacilityMarkerCount(selection: FacilityLayerSelection, cap: number): number;
export function facilityDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number | null;
