import type { ProviderFailure } from "../../lib/provider-failure.js";
export type ApiState = "live" | "empty" | "error" | "ready";

export type ApiStatus = {
  id: string;
  name: string;
  role: string;
  state: ApiState;
  count: number;
  note: string;
  failure?: ProviderFailure;
  partial?: boolean;
  failures?: ProviderFailure[];
  unclassifiedFailure?: boolean;
};

export type TransportProviderState = "connected" | "ready" | "error" | "missing" | "checking";
export type TransportQueryEvidence = { queryStatus?: "success" | "error" | "not-requested"; resultCount?: number | null; failure?: ProviderFailure };
export type TransportProvider = { id: string; name: string; role: string; configured: boolean; state: TransportProviderState; detail?: string } & TransportQueryEvidence;
export type TransportMode = "all" | "car" | "rail" | "bus" | "regional";
export type TransportContext = {
  arrivalRetrievedAt?: string | null;
  nearbyStops: Array<{ id: string; name: string; cityCode: string }>;
  arrivals: Array<{ route: string; minutes: number | null; stops: number | null }>;
  korail: Array<{ trainNo: string; departure: string; arrival: string; departureTime: string }>;
  catalog: { trainCities: number; expressTerminals: number; intercityTerminals: number };
  datasets: Array<{ id: string; name: string; state: "live" | "ready" | "error" | "missing" } & TransportQueryEvidence>;
};
export type KeyHealthItem = {
  id: string;
  name: string;
  state: "configured" | "missing" | "optional";
  optional: boolean;
  note: string;
};
export type KeyHealth = { ok?: boolean; scope?: "configuration"; checkedAt: string; keys: KeyHealthItem[] };

// 스펙 48: 숙소(contentTypeId "32") 편의시설을 들어가기/객실과 욕실/머무는
// 동안 세 묶음으로 나눠 보여줄 때 쓰는 타입. `lib/stay-facility.js`의
// `groupStayFacilities`가 만든다.
export type StayFacilityGroup = {
  id: "entry" | "room" | "stay";
  title: string;
  items: { key: string; label: string; state: "confirmed" | "unknown" | "negative"; detail?: string }[];
};

export type Place = {
  startDate?: string;
  endDate?: string;
  facilityLookupState?: string;
  id: string;
  contentTypeId: string;
  city: string;
  name: string;
  address: string;
  summary: string;
  image: string;
  mapX: string;
  mapY: string;
  score: number | null;
  confidence?: number;
  knownFields?: number;
  unknownFields?: number;
  negativeFields?: number;
  checkedAt?: string;
  accessibility?: Array<{ key: string; label: string; state: "confirmed" | "unknown" | "negative"; detail: string }>;
  features: string[];
  details: string[];
  source: string;
  temporaryStop?: { kind: "official-restroom"; sourceId: string; referenceDate: string; evidence: Record<string, string> };
};

export type Course = { name: string; distance: string; minutes: string; level: string; summary: string; sigun: string };
export type AudioGuide = { title: string; audioTitle: string; audioUrl: string; script: string; playTime: string };
export type PhotoInfo = { id: string; title: string; image: string; location: string; photographer: string; month: string };
export type RouteStop = {
  id?: string;
  title: string;
  note: string;
  source: string;
  contentTypeId?: string;
  mapX?: string;
  mapY?: string;
  visitMinutes?: number;
  evidenceState?: "verified" | "limited" | "context";
};

export type PlanData = {
  criteria?: { facilityKeys?: string[] };
  mode: "live" | "partial" | "fallback";
  generatedAt: string;
  baseYm: string;
  places: Place[];
  explorationPlaces?: Place[];
  excludedPlaces?: Place[];
  pagination?: { page: number; nextPage?: number | null; hasMore: boolean; scope: "loaded-candidates" };
  course: Course | null;
  audio: AudioGuide | null;
  photo?: PhotoInfo | null;
  crowd?: { rate: number; baseYmd: string; place: string } | null;
  stops: RouteStop[];
  statuses: ApiStatus[];
};

export type RichSpot = { id: string; title: string; address: string; summary: string; image: string; mapX: string; mapY: string; tag: string; source: string };
export type EnrichmentData = {
  generatedAt: string;
  visitor: { total: number; byType: Record<string, number>; startYmd: string; endYmd: string };
  demand: Array<{ name: string; value: number; baseYm: string }>;
  camping: RichSpot[];
  pet: RichSpot[];
  wellness: RichSpot[];
  medical: RichSpot[];
  language: RichSpot[];
  awards: RichSpot[];
  water: RichSpot[];
  rests: RichSpot[];
  events: RichSpot[];
  lodging: RichSpot[];
  statuses: ApiStatus[];
};
export type WeatherDay = { date: string; code: number; label: string; max: number; min: number; rainProbability: number; rain: number; snow: number; uv: number; advice: string[] };
export type WeatherData = { region: string; updatedAt: string; source: string; current: { temperature: number; apparent: number; code: number; label: string; windMps: number; precipitation: number; isDay: boolean }; days: WeatherDay[]; advice: string[] };
export type SearchPlaceType = "region" | "tourism" | "cafe" | "restaurant" | "other";
export type SearchPlace = { id: string; name: string; address: string; category: string; categoryCode?: string; region?: string; resultType?: SearchPlaceType; summary?: string; mapX: string; mapY: string; placeUrl?: string };
export type RichMode = "events" | "lodging" | "camping" | "pet" | "wellness" | "medical" | "water" | "language" | "awards" | "rests";
export type DestinationCrowd = { rate: number; baseYmd: string; place: string };

/**
 * 음식점 접근성 겹쳐 보기(스펙 08).
 *
 * 개별 음식점의 후기 수·별점·조회수·순위를 주는 공식 제공처가 없다. 그래서
 * 이 타입에는 그런 필드를 두지 않는다. 나중에 채우려는 자리도 만들지 않는다.
 * 사용자 좌표를 표현하는 필드도 만들지 않는다. `destination`은 여행지의 공개
 * 좌표이며, `distanceMeters`는 그 공개 좌표 기준의 직선거리다.
 */
export type DiningEvidence = "official" | "place-search";
export type DiningFacility = { key: string; label: string; state: "confirmed" | "unknown" | "negative" };
export type DiningPlace = {
  id: string;
  evidence: DiningEvidence;
  name: string;
  address: string;
  category?: string;
  distanceMeters: number;
  destination: { latitude: number; longitude: number };
  hours?: string;
  phone?: string;
  facilities: DiningFacility[];
  placeUrl?: string;
  checkedAt: string;
  source: string;
};
export type DiningAccessibilityResponse = {
  status: "available" | "empty" | "invalid-request" | "provider-error" | "location-unconfirmed";
  contentId: string;
  checkedAt: string;
  source: string;
  items: DiningPlace[];
  message?: string;
};
