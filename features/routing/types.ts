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
};

export type CrowdSignal = { rate: number; baseYmd?: string; place?: string };

export type MapProvider = "kakao" | "osm" | "loading";
export type MapToolPanel = "nearby" | "layers" | "export" | "route" | "place" | null;
export type MapPickMode = "origin" | "destination" | null;
export type MeasurementMode = "POLYLINE" | "CIRCLE" | "POLYGON";

export type RouteMapProps = {
  origin: RoutePoint;
  places: MapPlace[];
  route: RouteAlternative | null;
  crowd?: CrowdSignal | null;
  crowdPlaceId?: string;
  onOriginChange?: (point: RoutePoint, label: string) => void;
  onDestinationChange?: (place: MapPlace) => void;
  /** 지도에 표시된 여행지를 내 일정에 추가하고 추가된 개수를 돌려준다. */
  onSavePlaces?: (places: MapPlace[]) => number;
};
