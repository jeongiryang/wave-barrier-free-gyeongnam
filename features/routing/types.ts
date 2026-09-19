import type { FacilityLayerMarker } from "../../lib/facility-layers";

export type RoutePoint = { lat: number; lng: number };

export type RouteAlternative = {
  id: string;
  label: string;
  provider?: string;
  mode?: "transit" | "walk" | "bicycle" | "car" | "train" | "bus" | "preview";
  totalTime: number;
  payment: number | null;
  paymentType?: "fare" | "toll";
  totalWalk: number;
  transfers: number;
  totalDistance: number;
  configured: boolean;
  segments: Array<{
    type: "walk" | "bus" | "subway" | "intercity" | "train" | "bicycle" | "car";
    name: string;
    minutes: number;
  }>;
  geometry: RoutePoint[];
};

export type MapPlace = {
  id: string;
  name: string;
  image?: string;
  address?: string;
  summary?: string;
  placeUrl?: string;
  mapX: string;
  mapY: string;
  score: number | null;
  /**
   * 이미 조회한 장소 목록에 실려 오는 편의 확인 상태. 새 타입이 아니라
   * `server/tourism/accessibility-model.ts`의 `placeFrom` 결과와 같은 모양이다.
   * "안내견 동반이 확인된 곳" 같은 파생 레이어가 새 서버 호출 없이 이 필드에서
   * 마커를 만든다.
   */
  accessibility?: Array<{ key: string; label: string; state: "confirmed" | "unknown" | "negative"; detail?: string }>;
};

export type CrowdSignal = { rate: number; baseYmd?: string; place?: string };

export type MapProvider = "kakao" | "osm" | "loading" | "error";
export type MapToolPanel = "nearby" | "facility" | "layers" | "export" | "route" | "place" | null;
export type MapPickMode = "origin" | "destination" | null;
export type MeasurementMode = "POLYLINE" | "CIRCLE" | "POLYGON";

export type RouteMapProps = {
  origin: RoutePoint;
  places: MapPlace[];
  route: RouteAlternative | null;
  crowd?: CrowdSignal | null;
  crowdPlaceId?: string;
  focusedPlaceId?: string;
  onPlaceFocus?: (place: MapPlace) => void;
  onOriginChange?: (point: RoutePoint, label: string) => void;
  onDestinationChange?: (place: MapPlace) => void;
  /** 지도에 표시된 여행지를 내 일정에 추가하고 추가된 개수를 돌려준다. */
  onSavePlaces?: (places: MapPlace[]) => number;
};

/**
 * 지도에 넘기는 편의 마커.
 *
 * 지도 렌더러는 레이어 목록을 알 필요가 없다. 어떻게 보이고 어떻게 읽히는지를
 * 훅에서 미리 정해 넘긴다. 그래야 렌더러가 기능 상수에 의존하지 않는다.
 */
export type FacilityMapMarker = FacilityLayerMarker & {
  /** 접근 가능한 이름은 언제나 `{레이어 이름} {시설 이름}` 이다. */
  layerLabel: string;
  /** 색이 아닌 글자로 종류를 알리는 핀 안의 표시. */
  glyph: string;
  /** 공식 공공데이터는 사각 핀, 장소 검색은 원형 핀으로 모양을 구분한다. */
  official: boolean;
};
