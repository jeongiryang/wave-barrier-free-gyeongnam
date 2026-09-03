export type ApiState = "live" | "empty" | "error" | "ready";

export type ApiStatus = {
  id: string;
  name: string;
  role: string;
  state: ApiState;
  count: number;
  note: string;
};

export type TransportProviderState = "connected" | "ready" | "error" | "missing" | "checking";
export type TransportProvider = { id: string; name: string; role: string; configured: boolean; state: TransportProviderState; detail?: string };
export type TransportMode = "all" | "car" | "rail" | "bus" | "regional";
export type TransportContext = {
  nearbyStops: Array<{ id: string; name: string; cityCode: string }>;
  arrivals: Array<{ route: string; minutes: number | null; stops: number }>;
  korail: Array<{ trainNo: string; departure: string; arrival: string; departureTime: string }>;
  catalog: { trainCities: number; expressTerminals: number; intercityTerminals: number };
  datasets: Array<{ id: string; name: string; state: "live" | "ready" | "error" | "missing" }>;
};
export type KeyHealthItem = {
  id: string;
  name: string;
  state: "configured" | "missing" | "optional";
  optional: boolean;
  note: string;
};
export type KeyHealth = { ok?: boolean; scope?: "configuration"; checkedAt: string; keys: KeyHealthItem[] };

export type Place = {
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
  features: string[];
  details: string[];
  source: string;
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
  mode: "live" | "partial" | "fallback";
  generatedAt: string;
  baseYm: string;
  places: Place[];
  explorationPlaces?: Place[];
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
export type WeatherData = { region: string; updatedAt: string; source: string; current: { temperature: number; apparent: number; code: number; label: string; wind: number; precipitation: number; isDay: boolean }; days: WeatherDay[]; advice: string[] };
export type SearchPlace = { id: string; name: string; address: string; category: string; mapX: string; mapY: string; placeUrl?: string };
export type RichMode = "events" | "lodging" | "camping" | "pet" | "wellness" | "medical" | "water" | "language" | "awards" | "rests";
export type DestinationCrowd = { rate: number; baseYmd: string; place: string };
