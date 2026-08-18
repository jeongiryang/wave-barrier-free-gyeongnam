"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import RouteMap, { type MapPlace, type RouteAlternative, type RoutePoint } from "../../components/RouteMap";
import { PreferenceControls, useSitePreferences } from "../../components/SitePreferences";
import SmartSpotImage from "../../components/SmartSpotImage";
import AccessIcon, { type AccessIconName } from "../../components/AccessIcons";
import HelpCenter from "../../components/HelpCenter";

type ApiState = "live" | "empty" | "error" | "ready";

type ApiStatus = {
  id: string;
  name: string;
  role: string;
  state: ApiState;
  count: number;
  note: string;
};

type TransportProviderState = "connected" | "ready" | "error" | "missing" | "checking";
type TransportProvider = { id: string; name: string; role: string; configured: boolean; state: TransportProviderState; detail?: string };
type TransportMode = "all" | "car" | "rail" | "bus" | "regional" | "mobility";
type TransportContext = {
  nearbyStops: Array<{ id: string; name: string; cityCode: string }>;
  arrivals: Array<{ route: string; minutes: number | null; stops: number }>;
  korail: Array<{ trainNo: string; departure: string; arrival: string; departureTime: string }>;
  catalog: { trainCities: number; expressTerminals: number; intercityTerminals: number };
  datasets: Array<{ id: string; name: string; state: "live" | "ready" | "error" | "missing" }>;
};
type KeyHealthItem = {
  id: string;
  name: string;
  state: "configured" | "missing" | "optional";
  optional: boolean;
  note: string;
};
type KeyHealth = { checkedAt: string; keys: KeyHealthItem[] };

const transportStateLabel: Record<TransportProviderState, string> = {
  connected: "운행정보 확인",
  ready: "이용 가능",
  error: "잠시 지연",
  missing: "준비 중",
  checking: "확인 중",
};

const transportModes: Array<{ id: TransportMode; label: string; description: string }> = [
  { id: "all", label: "전체", description: "모든 교통 데이터" },
  { id: "car", label: "자동차", description: "카카오 자동차 경로" },
  { id: "rail", label: "기차·철도", description: "KORAIL·TAGO 철도" },
  { id: "bus", label: "시내버스", description: "정류장·도착·노선" },
  { id: "regional", label: "고속·시외", description: "터미널·도착 정보" },
  { id: "mobility", label: "기타 이동", description: "항공·선박·공유 이동" },
];

const transportDatasetMeta: Record<string, { mode: TransportMode; description: string }> = {
  "bus-stop": { mode: "bus", description: "목적지 좌표 주변의 시내버스 정류장을 조회합니다." },
  "bus-route": { mode: "bus", description: "선택한 도시의 시내버스 노선 정보를 확인합니다." },
  "bus-location": { mode: "bus", description: "노선을 선택하면 운행 중인 버스 위치를 확인할 수 있습니다." },
  "bus-arrival": { mode: "bus", description: "가장 가까운 정류장의 버스 도착 예정 시간을 조회합니다." },
  subway: { mode: "rail", description: "도시철도 역·노선 운행정보를 조회합니다." },
  "express-arrival": { mode: "regional", description: "고속버스 도착과 터미널 정보를 확인합니다." },
  train: { mode: "rail", description: "TAGO 열차 도시 코드와 철도 데이터 제공 범위를 확인합니다." },
  express: { mode: "regional", description: "전국 고속버스 터미널 목록을 조회합니다." },
  intercity: { mode: "regional", description: "전국 시외버스 터미널 목록을 조회합니다." },
  air: { mode: "mobility", description: "국내 항공 운항정보 기능의 연결 상태를 확인합니다." },
  ship: { mode: "mobility", description: "국내 여객선 운항정보 기능의 연결 상태를 확인합니다." },
  carshare: { mode: "mobility", description: "카셰어링 제공 지역과 차량 정보를 확인합니다." },
  pm: { mode: "mobility", description: "공유 퍼스널모빌리티 제공 현황을 확인합니다." },
  "korail-plan": { mode: "rail", description: "한국철도공사 여객열차 운행계획을 조회합니다." },
};

const officialBookingLinks = [
  { id: "korail", modes: ["all", "rail"], label: "코레일 승차권", detail: "KTX·일반열차 공식 예매", href: "https://www.korail.com/" },
  { id: "kobus", modes: ["all", "regional"], label: "고속버스 통합예매", detail: "전국고속버스운송사업조합", href: "https://www.kobus.co.kr/main.do" },
  { id: "bustago", modes: ["all", "regional"], label: "버스타고 시외버스", detail: "전국 시외버스 공식 예매", href: "https://www.bustago.or.kr/newweb/kr/index.do" },
] as const;

type Place = {
  id: string;
  contentTypeId: string;
  city: string;
  name: string;
  address: string;
  summary: string;
  image: string;
  mapX: string;
  mapY: string;
  score: number;
  confidence?: number;
  knownFields?: number;
  unknownFields?: number;
  negativeFields?: number;
  checkedAt?: string;
  features: string[];
  details: string[];
  source: string;
};

type Course = {
  name: string;
  distance: string;
  minutes: string;
  level: string;
  summary: string;
  sigun: string;
};

type AudioGuide = {
  title: string;
  audioTitle: string;
  audioUrl: string;
  script: string;
  playTime: string;
};

type PhotoInfo = {
  id: string;
  title: string;
  image: string;
  location: string;
  photographer: string;
  month: string;
};

type RouteStop = {
  title: string;
  note: string;
  source: string;
};

type PlanData = {
  mode: "live" | "partial" | "fallback";
  generatedAt: string;
  baseYm: string;
  places: Place[];
  course: Course | null;
  audio: AudioGuide | null;
  photo?: PhotoInfo | null;
  crowd?: { rate: number; baseYmd: string; place: string } | null;
  stops: RouteStop[];
  statuses: ApiStatus[];
};

type RichSpot = { id: string; title: string; address: string; summary: string; image: string; mapX: string; mapY: string; tag: string; source: string };
type EnrichmentData = {
  generatedAt: string;
  visitor: { total: number; byType: Record<string, number>; startYmd: string; endYmd: string };
  demand: Array<{ name: string; value: number; baseYm: string }>;
  camping: RichSpot[]; pet: RichSpot[]; wellness: RichSpot[]; medical: RichSpot[]; language: RichSpot[]; awards: RichSpot[]; water: RichSpot[]; rests: RichSpot[]; events: RichSpot[]; lodging: RichSpot[];
  statuses: ApiStatus[];
};
type WeatherDay = { date: string; code: number; label: string; max: number; min: number; rainProbability: number; rain: number; snow: number; uv: number; advice: string[] };
type WeatherData = { region: string; updatedAt: string; source: string; current: { temperature: number; apparent: number; code: number; label: string; wind: number; precipitation: number; isDay: boolean }; days: WeatherDay[]; advice: string[] };
type SearchPlace = { id: string; name: string; address: string; category: string; mapX: string; mapY: string; placeUrl?: string };

function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateRange(start: string, end: string) {
  const first = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime()) || first > last) return [start];
  const days: string[] = [];
  for (let current = first; current <= last && days.length < 7; current = new Date(current.getTime() + 86400000)) {
    days.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`);
  }
  return days;
}

const departurePresets: Array<{ id: string; name: string; detail: string; point: RoutePoint }> = [
  { id: "changwon", name: "창원중앙역", detail: "KTX·시내버스 환승", point: { lat: 35.2422, lng: 128.6982 } },
  { id: "masan", name: "마산역", detail: "KTX·시외 이동", point: { lat: 35.2361, lng: 128.5771 } },
  { id: "jinju", name: "진주역", detail: "서부 경남 출발", point: { lat: 35.1516, lng: 128.1180 } },
  { id: "gimhae", name: "김해공항", detail: "항공·경전철 환승", point: { lat: 35.1795, lng: 128.9382 } },
  { id: "tongyeong", name: "통영종합버스터미널", detail: "통영 시내 출발", point: { lat: 34.8680, lng: 128.4155 } },
];

const profiles: Array<{ id: string; icon: AccessIconName; label: string; short: string }> = [
  { id: "wheel", icon: "wheel", label: "휠체어 이용", short: "주차·접근로·승강기" },
  { id: "senior", icon: "senior", label: "걷기 불편", short: "짧은 동선·휴게 우선" },
  { id: "baby", icon: "baby", label: "영유아 동반", short: "유모차·수유실" },
  { id: "pregnant", icon: "pregnant", label: "임산부", short: "화장실·승강기 우선" },
  { id: "visual", icon: "visual", label: "시각 정보 지원", short: "점자·음성 안내" },
  { id: "hearing", icon: "hearing", label: "청각 정보 지원", short: "수어·영상 안내" },
];

const regions = [
  "경남 전체", "창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산",
  "의령", "함안", "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천",
];

const themes = [
  { id: "nature", label: "자연·휴양", code: "관광지 12" },
  { id: "history", label: "역사·문화", code: "문화시설 14" },
  { id: "leisure", label: "레포츠", code: "레포츠 28" },
  { id: "food", label: "음식", code: "음식점 39" },
];

const fallbackPlaces: Place[] = [
  {
    id: "demo-jinhae",
    contentTypeId: "12",
    city: "창원",
    name: "진해해양공원",
    address: "경상남도 창원시 진해구",
    summary: "바다를 따라 이어지는 넓고 평탄한 산책 동선을 살펴보세요.",
    image: "",
    mapX: "128.716",
    mapY: "35.091",
    score: 92,
    features: ["장애인 주차", "엘리베이터", "화장실"],
    details: ["주차와 승강기 정보를 우선 확인합니다.", "이동 전 현장 운영정보를 다시 확인해 주세요."],
    source: "제안서 기반 미리보기",
  },
  {
    id: "demo-cable",
    contentTypeId: "12",
    city: "통영",
    name: "통영케이블카",
    address: "경상남도 통영시",
    summary: "이동 부담을 줄이고 전망을 즐기는 통영 여행 후보입니다.",
    image: "",
    mapX: "128.425",
    mapY: "34.826",
    score: 88,
    features: ["휠체어 이동", "유모차", "휴게 공간"],
    details: ["탑승장 접근 경로와 승강기를 확인합니다.", "혼잡 시간과 휴게 지점을 함께 고려합니다."],
    source: "제안서 기반 미리보기",
  },
  {
    id: "demo-jinju",
    contentTypeId: "12",
    city: "진주",
    name: "진주성",
    address: "경상남도 진주시",
    summary: "남강변의 역사와 관광 해설을 함께 만나는 여행 후보입니다.",
    image: "",
    mapX: "128.080",
    mapY: "35.189",
    score: 84,
    features: ["오디오 가이드", "완만한 경로", "화장실"],
    details: ["완만한 진입 경로를 우선 안내합니다.", "해설 음원과 대본 제공 여부를 확인합니다."],
    source: "제안서 기반 미리보기",
  },
];

const apiMeta = [
  { id: "barrierfree", name: "무장애 여행정보", role: "주차·접근로·휠체어·화장실 등 상세 편의정보" },
  { id: "tour", name: "국문 관광정보", role: "관광지 좌표·이미지·주소와 지역 기반 검색" },
  { id: "audio", name: "관광지 오디오 가이드", role: "관광 해설 음원과 청각 지원용 전체 대본" },
  { id: "durunubi", name: "두루누비 정보", role: "걷기 코스 거리·시간·난이도와 여행자 정보" },
  { id: "hub", name: "기초지자체 중심 관광지", role: "지역 안에서 연결성이 높은 중심 관광지 순위" },
  { id: "photo", name: "관광사진 정보", role: "지역·축제 키워드 기반 관광사진과 촬영 출처" },
  { id: "related", name: "관광지별 연관 관광지", role: "함께 방문하기 좋은 관광·음식·숙박 후보" },
  { id: "crowd", name: "관광지 집중률 예측", role: "향후 30일 혼잡도와 회피 근거" },
];

const richCatalog = [
  { id: "events", label: "축제·행사", icon: "✦", description: "지금 열리는 지역 이야기" },
  { id: "lodging", label: "숙박", icon: "⌂", description: "지역별 머물 곳" },
  { id: "wellness", label: "웰니스", icon: "◌", description: "자연·치유·명상" },
  { id: "camping", label: "캠핑", icon: "△", description: "야영장·휴양" },
  { id: "pet", label: "반려동물", icon: "♧", description: "동반 가능 여행" },
  { id: "water", label: "물과 여행", icon: "≈", description: "댐·하천·수변" },
  { id: "medical", label: "의료관광", icon: "+", description: "의료·회복" },
  { id: "awards", label: "수상 사진", icon: "▣", description: "공모전 시선" },
  { id: "language", label: "글로벌", icon: "文", description: "선택 언어 관광" },
  { id: "rests", label: "테마휴게소", icon: "↗", description: "고속도로 여행" },
] as const;

const readyStatuses: ApiStatus[] = apiMeta.map((item) => ({
  ...item,
  state: "ready",
  count: 0,
  note: "승인 완료 · 검색 시 호출",
}));

const fallbackStops: RouteStop[] = fallbackPlaces.map((place, index) => ({
  title: place.name,
  note: index === 0
    ? "주차장에서 목적지까지 접근 가능한 이동 정보를 먼저 확인해요."
    : index === 1
      ? "화장실과 휴게 지점을 함께 살펴 이동 부담을 나눠요."
      : "오디오 해설과 완만한 구간으로 하루를 마무리해요.",
  source: "W.A.V.E 미리보기",
}));

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export default function PlannerPage() {
  const { locale, t } = useSitePreferences();
  const [selected, setSelected] = useState<string[]>(["wheel"]);
  const [region, setRegion] = useState("창원");
  const [theme, setTheme] = useState("nature");
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("조건을 선택한 뒤 실시간 관광 데이터를 불러오세요.");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [travelStart, setTravelStart] = useState(localDate());
  const [travelEnd, setTravelEnd] = useState(localDate(1));
  const [scheduleAssignments, setScheduleAssignments] = useState<Record<string, string>>({});
  const [headerHidden, setHeaderHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [origin, setOrigin] = useState<RoutePoint>(departurePresets[0].point);
  const [originLabel, setOriginLabel] = useState(departurePresets[0].name);
  const [privateOrigin, setPrivateOrigin] = useState(false);
  const [routeAlternatives, setRouteAlternatives] = useState<RouteAlternative[]>([]);
  const [routeDestination, setRouteDestination] = useState<Place | null>(null);
  const [destinationCrowd, setDestinationCrowd] = useState<{ rate: number; baseYmd: string; place: string } | null>(null);
  const [activeRouteId, setActiveRouteId] = useState("");
  const [routeSort, setRouteSort] = useState<"time" | "fare" | "transfer" | "walk">("time");
  const [transportMode, setTransportMode] = useState<TransportMode>("all");
  const [selectedTransportDataset, setSelectedTransportDataset] = useState("bus-arrival");
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeNotice, setRouteNotice] = useState("여행지를 찾으면 출발지부터의 이동 경로를 비교합니다.");
  const [transportProviders, setTransportProviders] = useState<TransportProvider[]>([]);
  const [transportContext, setTransportContext] = useState<TransportContext | null>(null);
  const [keyHealth, setKeyHealth] = useState<KeyHealth | null>(null);
  const [keyHealthChecked, setKeyHealthChecked] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackState, setFeedbackState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [enrichment, setEnrichment] = useState<EnrichmentData | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [richMode, setRichMode] = useState<"events" | "lodging" | "camping" | "pet" | "wellness" | "medical" | "water" | "language" | "awards" | "rests">("events");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [pointPicker, setPointPicker] = useState<"origin" | "destination" | null>(null);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSearchResults, setPlaceSearchResults] = useState<SearchPlace[]>([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const placeDialogRef = useRef<HTMLElement>(null);

  const activeProfiles = useMemo(
    () => profiles.filter((profile) => selected.includes(profile.id)),
    [selected],
  );
  const activePlaces = plan?.places.length ? plan.places : region === "창원" ? fallbackPlaces : [];
  const activeStops = plan?.stops.length ? plan.stops : region === "창원" ? fallbackStops : [];
  const statuses = plan ? [...plan.statuses, ...(enrichment?.statuses || [])] : readyStatuses;
  const liveCount = statuses.filter((status) => status.state === "live").length;
  /* 경로를 계산하기 전에는 제공기관별 운행 응답을 알 수 없다. 그렇다고 계속
     "확인 중"으로 두면 끝나지 않는 조회가 도는 것처럼 보이므로, 이미 받아 둔
     /api/health의 인증키 상태로 지금 말할 수 있는 만큼만 알린다. */
  const fallbackProviders = useMemo<TransportProvider[]>(() => {
    const stateOf = (id: string): TransportProviderState => {
      if (!keyHealth) return keyHealthChecked ? "error" : "checking";
      return keyHealth.keys.find((key) => key.id === id)?.state === "configured" ? "ready" : "missing";
    };
    return [
      { id: "kakao-drive", name: "KAKAO DRIVE", role: "자동차 시간·거리·통행료", key: "kakao-route" },
      { id: "odsay", name: "ODsay", role: "대중교통 경로", key: "odsay" },
      { id: "korail", name: "KORAIL", role: "여객열차 운행계획", key: "public-transport" },
      { id: "tago-bus", name: "TAGO BUS", role: "정류장·도착", key: "public-transport" },
      { id: "tago-rail", name: "TAGO RAIL", role: "열차·지하철", key: "public-transport" },
      { id: "tago-regional", name: "TAGO EXPRESS", role: "고속·시외버스", key: "public-transport" },
      { id: "tago-mobility", name: "TAGO MOVE", role: "항공·선박·공유교통", key: "public-transport" },
    ].map(({ key, ...provider }) => {
      const state = stateOf(key);
      return { ...provider, configured: state === "ready", state };
    });
  }, [keyHealth, keyHealthChecked]);

  // 경로 계산 뒤에는 실제 응답이, 그전에는 인증키 기준 상태가 쓰인다.
  const effectiveProviders = transportProviders.length ? transportProviders : fallbackProviders;

  const filteredRouteAlternatives = useMemo(() => routeAlternatives.filter((route) => {
    if (transportMode === "all") return true;
    if (transportMode === "car") return route.mode === "car";
    if (transportMode === "rail") return route.mode === "train" || /KORAIL|철도|열차/i.test(`${route.provider} ${route.label}`);
    if (transportMode === "bus") return route.mode === "bus" || route.mode === "transit";
    if (transportMode === "regional") return route.mode === "train" || /고속|시외/i.test(route.label);
    return route.mode === "walk" || route.mode === "bicycle";
  }), [routeAlternatives, transportMode]);
  const sortedRouteAlternatives = useMemo(() => [...filteredRouteAlternatives].sort((a, b) => {
    if (routeSort === "fare") return (a.payment ?? Number.MAX_SAFE_INTEGER) - (b.payment ?? Number.MAX_SAFE_INTEGER);
    if (routeSort === "transfer") return a.transfers - b.transfers || a.totalTime - b.totalTime;
    if (routeSort === "walk") return a.totalWalk - b.totalWalk || a.totalTime - b.totalTime;
    return a.totalTime - b.totalTime;
  }), [filteredRouteAlternatives, routeSort]);
  const activeRoute = sortedRouteAlternatives.find((item) => item.id === activeRouteId) ?? sortedRouteAlternatives[0] ?? null;
  const selectedDataset = transportContext?.datasets.find((item) => item.id === selectedTransportDataset) ?? null;
  const activeTransportMode = transportModes.find((item) => item.id === transportMode) ?? transportModes[0];
  const providerErrors = transportProviders.filter((item) => item.state === "error").length;
  const dataErrors = statuses.filter((status) => status.state === "error").length;
  const richItems = enrichment?.[richMode] ?? [];
  const visitorTypes = Object.entries(enrichment?.visitor.byType ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);
  const demandMax = Math.max(...(enrichment?.demand.map((item) => item.value) ?? [0]), 1);
  const tripDays = useMemo(() => dateRange(travelStart, travelEnd), [travelEnd, travelStart]);
  const savedPlaces = activePlaces.filter((place) => saved.includes(place.id));

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/health", { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (!cancelled && data) setKeyHealth(data as KeyHealth); })
      .catch(() => { /* 화면 기능은 계속 사용할 수 있다. */ })
      .finally(() => { if (!cancelled) setKeyHealthChecked(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const queryRegion = new URLSearchParams(window.location.search).get("region");
      if (queryRegion && regions.includes(queryRegion)) setRegion(queryRegion);
      const storedSaved = window.localStorage.getItem("wave-saved-places");
      if (storedSaved) {
        try { setSaved(JSON.parse(storedSaved) as string[]); } catch { /* ignore invalid device data */ }
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("wave-saved-places", JSON.stringify(saved));
  }, [saved]);

  useEffect(() => {
    if (!selectedPlace) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedPlace(null);
        return;
      }
      if (event.key !== "Tab" || !placeDialogRef.current) return;
      const focusable = [...placeDialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => placeDialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [selectedPlace]);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      document.documentElement.style.setProperty("--scroll-progress", `${Math.min((y / max) * 100, 100)}%`);
      document.documentElement.style.setProperty("--scroll-shift", `${Math.min(y, 900)}px`);
      setScrolled(y > 24);
      if (y > lastY + 9 && y > 130) setHeaderHidden(true);
      if (y < lastY - 9 || y < 80) setHeaderHidden(false);
      lastY = y;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (reduced) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const node = entry.target as HTMLElement;
        if (entry.isIntersecting) node.classList.add("is-visible");
        else if (entry.boundingClientRect.top > 0) node.classList.remove("is-visible");
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -7%" });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [plan]);

  function toggleProfile(id: string) {
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  async function loadRoutes(place: Place, nextOrigin = origin, nextOriginIsPrivate = privateOrigin) {
    const endLat = Number(place.mapY); const endLng = Number(place.mapX);
    if (!Number.isFinite(endLat) || !Number.isFinite(endLng)) {
      setRouteNotice("선택한 여행지에 좌표가 없어 경로를 계산할 수 없습니다.");
      setRouteAlternatives([]);
      return;
    }
    setRouteLoading(true);
    setRouteDestination(place);
    setDestinationCrowd(null);
    if (nextOriginIsPrivate) {
      setRouteLoading(false);
      setRouteAlternatives([]);
      setRouteNotice("현재 위치는 이 지도에서만 표시합니다. 좌표를 서버로 보내지 않으므로 카카오 지도 앱에서 경로를 이어서 확인해 주세요.");
      return;
    }
    setRouteNotice(`${originLabel}에서 ${place.name}까지 이동 경로를 확인하고 있습니다.`);
    const crowdParams = new URLSearchParams({ action: "crowd", region, title: place.name });
    void fetch(`/api/wave?${crowdParams.toString()}`, { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { crowd?: { rate: number; baseYmd: string; place: string } | null } | null) => setDestinationCrowd(data?.crowd || null))
      .catch(() => setDestinationCrowd(null));
    try {
      const params = new URLSearchParams({
        startLat: String(nextOrigin.lat), startLng: String(nextOrigin.lng), endLat: String(endLat), endLng: String(endLng),
      });
      const response = await fetch(`/api/route?${params.toString()}`, { cache: "no-store", headers: { Accept: "application/json" } });
      const data = await response.json() as { alternatives?: RouteAlternative[]; providers?: TransportProvider[]; context?: TransportContext; configured?: boolean; message?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "경로를 찾지 못했습니다.");
      const alternatives = data.alternatives || [];
      setRouteAlternatives(alternatives);
      setTransportProviders(data.providers || []);
      setTransportContext(data.context || null);
      setActiveRouteId(alternatives[0]?.id || "");
      setRouteNotice(data.configured ? `${alternatives.length}개 실제 교통 경로와 운행 데이터를 비교합니다.` : (data.message || "직선 연결 미리보기입니다."));
    } catch (error) {
      setRouteAlternatives([]);
      setRouteNotice(error instanceof Error ? error.message : "경로 연결을 확인해 주세요.");
    } finally {
      setRouteLoading(false);
    }
  }

  const loadEnrichment = useCallback(async () => {
    setEnrichmentLoading(true);
    try {
      const params = new URLSearchParams({ action: "enrich", region, theme, locale, startDate: travelStart, endDate: travelEnd });
      const response = await fetch(`/api/wave?${params.toString()}`, { headers: { Accept: "application/json" } });
      const data = await response.json() as EnrichmentData & { error?: string };
      if (!response.ok) throw new Error(data.error || "확장 데이터를 불러오지 못했습니다.");
      setEnrichment(data);
    } catch { setEnrichment(null); }
    finally { setEnrichmentLoading(false); }
  }, [region, theme, locale, travelStart, travelEnd]);

  useEffect(() => {
    if (!plan) return;
    const frame = window.requestAnimationFrame(() => void loadEnrichment());
    return () => window.cancelAnimationFrame(frame);
  }, [plan, loadEnrichment]);

  useEffect(() => {
    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      setWeatherLoading(true);
      setWeather(null);
    });
    void fetch(`/api/weather?region=${encodeURIComponent(region)}`, { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (!cancelled && data) setWeather(data as WeatherData); })
      .catch(() => { /* 예보 실패 시 나머지 여행 기능은 유지한다. */ })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; window.cancelAnimationFrame(frame); };
  }, [region]);

  async function searchLocations() {
    if (placeQuery.trim().length < 2) return;
    setPlaceSearchLoading(true);
    try {
      const response = await fetch(`/api/location-search?q=${encodeURIComponent(placeQuery.trim())}`, { headers: { Accept: "application/json" } });
      const data = await response.json() as { places?: SearchPlace[] };
      setPlaceSearchResults(response.ok ? data.places || [] : []);
    } catch { setPlaceSearchResults([]); }
    finally { setPlaceSearchLoading(false); }
  }

  function searchableToPlace(item: SearchPlace): Place {
    return { id: item.id || `${item.name}-${item.mapX}`, contentTypeId: "12", city: region, name: item.name, address: item.address, summary: item.category || "사용자가 직접 검색한 장소입니다.", image: "", mapX: item.mapX, mapY: item.mapY, score: 0, features: [], details: ["카카오 장소 검색 결과를 기준으로 경로를 계산합니다."], source: "사용자 장소 검색" };
  }

  function choosePoint(place: Place, mode = pointPicker) {
    if (mode === "origin") {
      const next = { lat: Number(place.mapY), lng: Number(place.mapX) };
      if (!Number.isFinite(next.lat) || !Number.isFinite(next.lng)) return;
      setOrigin(next); setOriginLabel(place.name); setPrivateOrigin(false);
      if (routeDestination || activePlaces[0]) void loadRoutes(routeDestination || activePlaces[0], next, false);
    } else if (mode === "destination") void loadRoutes(place, origin, privateOrigin);
    setPointPicker(null); setPlaceQuery(""); setPlaceSearchResults([]);
  }

  function routeFromRichSpot(spot: RichSpot) {
    const place: Place = {
      id: spot.id,
      contentTypeId: "",
      city: region,
      name: spot.title,
      address: spot.address,
      summary: spot.summary,
      image: spot.image,
      mapX: spot.mapX,
      mapY: spot.mapY,
      score: 0,
      features: [spot.tag],
      details: [spot.summary],
      source: spot.source,
    };
    void loadRoutes(place);
    document.getElementById("navigation")?.scrollIntoView({ behavior: "smooth" });
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setRouteNotice("이 브라우저는 현재 위치를 지원하지 않습니다.");
      return;
    }
    setRouteNotice("현재 위치 권한을 확인하고 있습니다.");
    navigator.geolocation.getCurrentPosition((position) => {
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      setOrigin(next); setOriginLabel("현재 위치"); setPrivateOrigin(true);
      setRouteAlternatives([]);
      setRouteNotice("현재 위치를 지도에 표시했습니다. 좌표는 서버나 저장소로 전송하지 않습니다.");
    }, () => setRouteNotice("위치 권한이 없어 출발 거점을 선택해 주세요."), { enableHighAccuracy: true, timeout: 8000 });
  }

  async function copyBookingRoute(provider: string) {
    const destination = routeDestination?.name || activePlaces[0]?.name || region;
    const text = `${originLabel} → ${destination}`;
    try {
      await navigator.clipboard?.writeText(text);
      setRouteNotice(`${provider} 공식 사이트를 열었습니다. 출발·도착 정보 “${text}”를 붙여넣을 수 있도록 복사했습니다.`);
    } catch {
      setRouteNotice(`${provider} 공식 사이트를 열었습니다. 출발 ${originLabel}, 도착 ${destination}을 선택해 주세요.`);
    }
  }

  async function sharePlan() {
    if (!plan || shareState === "saving") return;
    setShareState("saving");
    try {
      const response = await fetch("/api/trips", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, selections: { region, theme, profiles: selected, locale, travelStart, travelEnd, scheduleAssignments }, origin: { label: originLabel } }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "공유 링크를 만들지 못했습니다.");
      setShareUrl(data.url); setShareState("done");
      await navigator.clipboard?.writeText(data.url);
    } catch {
      setShareState("error");
    }
  }

  async function submitFeedback() {
    if (!selectedPlace || feedbackText.trim().length < 5 || feedbackState === "sending") return;
    setFeedbackState("sending");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId: selectedPlace.id, placeName: selectedPlace.name, field: "접근성 정보", message: feedbackText }),
      });
      if (!response.ok) throw new Error("feedback");
      setFeedbackText(""); setFeedbackState("done");
    } catch { setFeedbackState("error"); }
  }

  async function generatePlan() {
    if (!selected.length || loading) return;
    setLoading(true);
    setNotice("한국관광공사 8개 서비스에서 여행 근거를 모으고 있어요.");
    try {
      const params = new URLSearchParams({
        action: "plan",
        region,
        theme,
        profiles: selected.join(","),
        locale,
      });
      const response = await fetch(`/api/wave?${params.toString()}`, { headers: { Accept: "application/json" } });
      const data = await response.json() as PlanData & { error?: string };
      if (!response.ok) throw new Error(data.error || "API 응답을 불러오지 못했습니다.");
      setPlaying(false);
      setAudioProgress(0);
      setAudioTime(0);
      setAudioDuration(0);
      setPlan(data);
      if (data.places[0]) void loadRoutes(data.places[0]);
      const available = data.statuses.filter((status) => status.state === "live").length;
      setNotice(available
        ? `${available}개 데이터 서비스의 응답을 코스에 반영했습니다.`
        : "검색 결과가 없어 미리보기 여행지를 유지했습니다.");
    } catch (error) {
      setPlan({
        mode: "fallback",
        generatedAt: new Date().toISOString(),
        baseYm: "",
        places: fallbackPlaces,
        course: null,
        audio: null,
        photo: null,
        stops: fallbackStops,
        statuses: apiMeta.map((item) => ({ ...item, state: "error", count: 0, note: "현재 호출 확인 필요" })),
      });
      setNotice(`현재 실시간 연결을 확인할 수 없어 안전한 미리보기 데이터로 보여드려요. ${error instanceof Error ? error.message : "연결 상태를 확인해 주세요."}`);
    } finally {
      setLoading(false);
      window.setTimeout(() => document.getElementById("route")?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }

  function scrollCards(direction: number) {
    cardsRef.current?.scrollBy({ left: direction * Math.min(window.innerWidth * 0.78, 480), behavior: "smooth" });
  }

  function toggleSaved(id: string) {
    setSaved((current) => {
      if (current.includes(id)) {
        setScheduleAssignments((assignments) => { const next = { ...assignments }; delete next[id]; return next; });
        return current.filter((item) => item !== id);
      }
      setScheduleAssignments((assignments) => ({ ...assignments, [id]: assignments[id] || tripDays[0] || travelStart }));
      return [...current, id];
    });
  }

  async function toggleAudio() {
    const audio = audioRef.current;
    if (!audio || !plan?.audio?.audioUrl) {
      setTranscriptOpen(true);
      return;
    }
    if (audio.paused) await audio.play();
    else audio.pause();
  }

  const activeTheme = themes.find((item) => item.id === theme)?.label ?? "자연·휴양";
  return (
    <main className="planner-page">
      <a className="skip-link" href="#planner">{t("skip", "본문으로 바로가기")}</a>
      <div className="scroll-progress" aria-hidden="true" />
      <header className={`site-header ${scrolled ? "scrolled" : ""} ${headerHidden ? "hidden" : ""}`}>
        <a className="brand" href="/" aria-label="W.A.V.E 소개 홈">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>W.A.V.E</span>
        </a>
        <nav aria-label="주요 메뉴">
          <a href="#planner">{t("conditions", "여행 조건")}</a>
          <a href="#navigation">{t("route", "길찾기")}</a>
          <a href="#data">{t("evidence", "추천 근거")}</a>
        </nav>
        <div className="planner-header-actions"><HelpCenter /><PreferenceControls /><button className="header-action" type="button" onClick={() => document.getElementById("places")?.scrollIntoView({ behavior: "smooth" })}>
          여행 보관함 <b>{saved.length}</b><span aria-hidden="true">↗</span>
        </button></div>
      </header>

      <section className="tool-launch" id="top" aria-label="여행 만들기">
        <div><p className="service-breadcrumb"><a href="/">서비스 소개</a><span>›</span>내 여행</p><h1>내 여행 만들기</h1></div>
        <div className="tool-launch-status"><span><i /> 관광정보 {liveCount ? "확인됨" : "준비"}</span><span><i /> 교통정보 {effectiveProviders.some((item) => item.configured) ? "확인됨" : "준비"}</span><span>{locale.toUpperCase()}</span><button type="button" aria-expanded={diagnosticsOpen} onClick={() => setDiagnosticsOpen((open) => !open)}>서비스 상태<b>{diagnosticsOpen ? "−" : "+"}</b></button></div>
      </section>

      {diagnosticsOpen && <section className="connection-diagnostics" aria-label="서비스 상태">
        <header><div><span>SERVICE STATUS</span><h2>관광·지도·교통정보 이용 상태</h2></div><p>{keyHealth?.checkedAt ? `확인 ${new Date(keyHealth.checkedAt).toLocaleString("ko-KR")}` : "확인 중"}</p></header>
        <div className="diagnostic-grid">
          {(keyHealth?.keys || []).map((item) => <article key={item.id} className={item.state}><i /><div><strong>{item.name}</strong><p>{item.note}</p></div><span>{item.state === "configured" ? "이용 가능" : item.state === "optional" ? "선택 기능" : "준비 필요"}</span></article>)}
        </div>
        <footer><p><b>교통정보:</b> {transportProviders.length ? `${transportProviders.filter((item) => item.state === "connected").length}개 제공기관 확인 · 지연 ${providerErrors}개` : "여행지를 선택하면 교통정보를 확인합니다."}</p><p><b>관광정보:</b> {plan ? `최신 정보 ${liveCount}개 · 확인 필요 ${dataErrors}개` : "코스를 찾으면 제공기관별 확인 상태를 보여드려요."}</p><p>일부 운행정보는 제공기관의 조회 조건에 따라 결과가 없을 수 있습니다.</p></footer>
      </section>}

      <section className="planner-section" id="planner">
        <div className="workspace-heading" data-reveal>
          <div><span>01</span><h2>여행 조건</h2></div>
          <p>출발지 · 지역 · 테마 · 편의</p>
        </div>

        <div className="planner-bento" data-reveal>
          <div className="control-panel departure-control">
            <span className="step-label"><b>01</b> {t("startFrom", "어디서 출발할까요?")}</span>
            <div className="departure-row">
              <div className="select-shell"><i aria-hidden="true">◎</i><select value={departurePresets.find((item) => item.name === originLabel)?.id || "current"} onChange={(event) => {
                const preset = departurePresets.find((item) => item.id === event.target.value);
                if (!preset) return;
                setOrigin(preset.point); setOriginLabel(preset.name); setPrivateOrigin(false);
                if (activePlaces[0]) void loadRoutes(activePlaces[0], preset.point, false);
              }} aria-label="출발 거점 선택"><option value="current" disabled>{originLabel === "현재 위치" ? "현재 위치" : "출발 거점 선택"}</option>{departurePresets.map((item) => <option value={item.id} key={item.id}>{item.name} · {item.detail}</option>)}</select><small>출발</small></div>
              <button type="button" onClick={useCurrentLocation}>{t("currentLocation", "현재 위치")}</button>
            </div>
          </div>

          <label className="control-panel region-control">
            <span className="step-label"><b>02</b> {t("destination", "어디로 갈까요?")}</span>
            <div className="select-shell">
              <i aria-hidden="true">⌖</i>
              <select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="여행 지역 선택">
                {regions.map((item) => <option key={item}>{item}</option>)}
              </select>
              <small>법정동 시도 48</small>
            </div>
          </label>

          <fieldset className="control-panel theme-control">
            <legend className="step-label"><b>03</b> {t("enjoy", "무엇을 즐길까요?")}</legend>
            <div className="theme-grid">
              {themes.map((item) => (
                <button key={item.id} type="button" className={theme === item.id ? "active" : ""} onClick={() => setTheme(item.id)} aria-pressed={theme === item.id}>
                  <span>{item.label}</span><small>{item.code}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="control-panel date-control">
            <span className="step-label"><b>04</b> 언제 떠날까요?</span>
            <div className="date-range-fields">
              <label><span>출발일</span><input type="date" min={localDate()} value={travelStart} onChange={(event) => {
                const next = event.target.value;
                setTravelStart(next);
                if (travelEnd < next) setTravelEnd(next);
              }} /></label>
              <i aria-hidden="true">→</i>
              <label><span>도착일</span><input type="date" min={travelStart} value={travelEnd} onChange={(event) => setTravelEnd(event.target.value)} /></label>
            </div>
            <p>최대 7일 일정과 해당 기간에 열리는 축제·행사를 함께 보여드려요.</p>
          </div>

          <div className="control-panel profile-panel">
            <div className="preference-label"><span className="step-label"><b>05</b> {t("support", "어떤 편의가 필요할까요?")}</span><small>여러 개 선택 가능</small></div>
            <div className="profile-grid" role="group" aria-label="여행 편의 조건 선택">
              {profiles.map((profile) => {
                const active = selected.includes(profile.id);
                return (
                  <button key={profile.id} type="button" className={active ? "profile-card active" : "profile-card"} aria-pressed={active} onClick={() => toggleProfile(profile.id)}>
                    <span className="profile-icon" aria-hidden="true"><AccessIcon name={profile.icon} size={24} /></span>
                    <span><strong>{profile.label}</strong><small>{profile.short}</small></span>
                    <i aria-hidden="true">{active ? "✓" : "+"}</i>
                  </button>
                );
              })}
            </div>
            <p className="derived-note">‘걷기 불편’과 ‘임산부’는 무장애 API의 접근로·승강기·화장실 항목을 W.A.V.E 기준으로 조합한 필터입니다.</p>
          </div>

          <div className="selection-bar" aria-live="polite">
            <div><span className="pulse-dot" aria-hidden="true" /><p><b>{activeProfiles.length || "조건을"}개 선택</b><span>{activeProfiles.length ? activeProfiles.map((item) => item.label).join(" · ") : "원하는 여행 조건을 골라주세요"}</span></p></div>
            <button className="generate-button" type="button" onClick={generatePlan} disabled={!selected.length || loading}>
              {loading ? <><span className="button-loader" /> 데이터 연결 중</> : <>{t("search", "공공데이터로 코스 찾기")} <span aria-hidden="true">→</span></>}
            </button>
          </div>
          <p className="planner-notice" aria-live="polite">{notice}</p>
        </div>
      </section>

      <section className="places-section" id="places">
        <div className="workspace-heading" data-reveal>
          <div><span>03</span><h2>{t("placesTitle", "추천 여행지")}</h2></div>
          <div className="carousel-actions"><button type="button" onClick={() => scrollCards(-1)} aria-label="이전 여행지">←</button><button type="button" onClick={() => scrollCards(1)} aria-label="다음 여행지">→</button></div>
        </div>
        <div className="place-carousel" ref={cardsRef} aria-busy={loading}>
          {loading && [0, 1, 2].map((item) => <article className="place-card place-card-skeleton" key={`place-skeleton-${item}`} aria-hidden="true"><div className="skeleton-visual" /><div className="skeleton-copy"><i /><b /><span /><span /><em /></div></article>)}
          {!loading && !activePlaces.length && <div className="place-empty"><span>⌖</span><h3>{region}의 실시간 여행지를 아직 불러오지 않았습니다.</h3><p>위에서 조건을 선택하고 ‘공공데이터로 코스 찾기’를 눌러주세요.</p></div>}
          {!loading && activePlaces.map((place, index) => {
            const visualStyle = place.image ? { "--place-image": `url("${place.image}")` } as CSSProperties : undefined;
            return (
              <article className="place-card" key={place.id} data-reveal>
                <div className={`place-visual visual-${index % 4}`} style={visualStyle}>
                  <span className="city-chip">{place.city || region}</span>
                  <span className="place-rank">{String(index + 1).padStart(2, "0")}</span>
                  <button type="button" className={saved.includes(place.id) ? "save-card saved" : "save-card"} onClick={() => toggleSaved(place.id)} aria-label={`${place.name} 보관하기`}>{saved.includes(place.id) ? "♥" : "♡"}</button>
                </div>
                <div className="place-content">
                  <div className="place-title"><div><h3>{place.name}</h3><p>{place.summary}</p></div><span className="score-badge"><b>{place.score}</b><small>W.A.V.E 적합도</small></span></div>
                  <div className="feature-list">{place.features.slice(0, 3).map((feature) => <span key={feature}>✓ {feature}</span>)}</div>
                  {typeof place.confidence === "number" && <div className="confidence-row"><span>정보 확인률 <b>{place.confidence}%</b></span><span>정보 없음 {place.unknownFields || 0}개</span></div>}
                  <div className="place-actions"><button type="button" onClick={() => setSelectedPlace(place)}>접근성 상세 <span aria-hidden="true">↗</span></button><button type="button" onClick={() => { void loadRoutes(place); document.getElementById("navigation")?.scrollIntoView({ behavior: "smooth" }); }}>이곳까지 길찾기 <span aria-hidden="true">→</span></button></div>
                </div>
              </article>
            );
          })}
        </div>
        {savedPlaces.length > 0 && <section className="day-planner" data-reveal aria-label="날짜별 여행 일정">
          <header><div><span>나의 여행 일정</span><h3>보관한 장소를 날짜별로 정리하세요.</h3></div><p>장소 선택은 이 기기에만 저장되며 공유하기 전에는 서버로 전송되지 않습니다.</p></header>
          <div className="day-planner-grid">{tripDays.map((day, dayIndex) => <article key={day}>
            <div><small>DAY {String(dayIndex + 1).padStart(2, "0")}</small><strong>{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(new Date(`${day}T12:00:00`))}</strong></div>
            <ol>{savedPlaces.filter((place) => (scheduleAssignments[place.id] || tripDays[0]) === day).map((place, index) => <li key={place.id}><span>{index + 1}</span><div><b>{place.name}</b><small>{place.address || place.city}</small></div><select aria-label={`${place.name} 여행 날짜`} value={scheduleAssignments[place.id] || tripDays[0]} onChange={(event) => setScheduleAssignments((current) => ({ ...current, [place.id]: event.target.value }))}>{tripDays.map((date, dateIndex) => <option key={date} value={date}>DAY {dateIndex + 1}</option>)}</select></li>)}</ol>
            {!savedPlaces.some((place) => (scheduleAssignments[place.id] || tripDays[0]) === day) && <p>보관한 장소의 날짜를 이 날로 바꿔 추가하세요.</p>}
          </article>)}</div>
        </section>}
      </section>

      <section className="travel-layers" id="layers">
        <div className="workspace-heading inverse" data-reveal>
          <div><span>04</span><h2>{region} 데이터 탐색</h2></div>
          <p>방문 · 수요 · 테마</p>
        </div>

        <section className="weather-board" data-reveal aria-busy={weatherLoading} aria-label={`${region} 여행 날씨`}>
          {weatherLoading && <><div className="weather-current weather-skeleton"><i /><b /><span /></div><div className="weather-days">{[0,1,2,3,4,5,6].map((item) => <div className="weather-day weather-skeleton" key={item}><i /><b /><span /></div>)}</div></>}
          {!weatherLoading && weather && <>
            <div className="weather-current"><small>현재 여행 날씨 · {weather.source}</small><div><span className={`weather-symbol code-${weather.current.code}`} aria-hidden="true" /><strong>{Math.round(weather.current.temperature)}°</strong><p><b>{weather.current.label}</b><span>체감 {Math.round(weather.current.apparent)}° · 바람 {weather.current.wind.toFixed(1)}km/h</span></p></div><ul>{weather.advice.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="weather-days">{weather.days.map((day, index) => <article className="weather-day" key={day.date}><small>{index === 0 ? "오늘" : new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</small><span className={`weather-symbol code-${day.code}`} aria-hidden="true" /><strong>{Math.round(day.max)}° <em>{Math.round(day.min)}°</em></strong><p>비 {Math.round(day.rainProbability)}% · UV {day.uv.toFixed(0)}</p>{day.snow > 0 && <b>눈 {day.snow.toFixed(1)}cm</b>}</article>)}</div>
          </>}
          {!weatherLoading && !weather && <div className="weather-empty"><strong>예보를 잠시 불러오지 못했습니다.</strong><span>관광 데이터와 경로 기능은 그대로 이용할 수 있어요.</span></div>}
        </section>

        <div className="insight-board" data-reveal aria-busy={enrichmentLoading}>
          <article className="visitor-insight">
            <div className="insight-label"><span>01</span><p>지역 방문 흐름</p></div>
            {enrichmentLoading ? <div className="insight-skeleton" /> : <>
              <strong>{enrichment?.visitor.total ? enrichment.visitor.total.toLocaleString() : "—"}<small>{enrichment?.visitor.total ? "명" : "검색 후 표시"}</small></strong>
              <p>{enrichment?.visitor.startYmd && enrichment?.visitor.endYmd ? `${enrichment.visitor.startYmd}–${enrichment.visitor.endYmd} 지역 방문 흐름` : "지역별 방문자 API의 최신 가용 구간을 확인합니다."}</p>
              <div className="visitor-bars">
                {visitorTypes.length ? visitorTypes.map(([name, value]) => <div key={name}><span>{name}</span><i><b style={{ width: `${Math.max(8, (value / Math.max(...visitorTypes.map(([, amount]) => amount), 1)) * 100)}%` }} /></i><em>{value.toLocaleString()}</em></div>) : <small>방문 유형별 데이터가 있으면 이곳에 비교 막대로 표시됩니다.</small>}
              </div>
            </>}
          </article>

          <article className="demand-insight">
            <div className="insight-label"><span>02</span><p>관광 수요 지표</p></div>
            <h3>사람들이 지금<br />무엇을 찾는지 봅니다.</h3>
            <div className="demand-list">
              {enrichmentLoading ? <><div className="insight-skeleton short" /><div className="insight-skeleton short" /></> : enrichment?.demand.length ? enrichment.demand.slice(0, 5).map((item) => <div key={`${item.name}-${item.baseYm}`}><span><b>{item.name}</b><em>{item.value.toFixed(1)}</em></span><i><b style={{ width: `${Math.max(5, (item.value / demandMax) * 100)}%` }} /></i></div>) : <p>지역 관광자원 수요지수의 최신 가용월을 조회합니다.</p>}
            </div>
          </article>

          <aside className="layer-principle">
            <span>W.A.V.E 여행 메모</span>
            <strong>많이 찾는 곳과<br />나에게 맞는 곳은<br />다를 수 있어요.</strong>
            <p>수요·방문량은 순위가 아니라 선택의 맥락으로만 사용합니다. 접근성 적합도와 혼잡 예측을 함께 보세요.</p>
          </aside>
        </div>

        <div className="theme-explorer" data-reveal>
          <div className="layer-tabs" role="tablist" aria-label="여행 테마 데이터 선택">
            {richCatalog.map((item) => <button key={item.id} type="button" role="tab" aria-selected={richMode === item.id} className={richMode === item.id ? "active" : ""} onClick={() => setRichMode(item.id)}><span>{item.icon}</span><b>{item.label}</b><small>{item.description}</small></button>)}
          </div>
          <div className="rich-rail" role="tabpanel">
            {enrichmentLoading && [0, 1, 2].map((item) => <div className="rich-card rich-loading" key={item}><i /><span /><b /></div>)}
            {!enrichmentLoading && !richItems.length && <div className="rich-empty"><span>⌁</span><h3>{region}의 {richCatalog.find((item) => item.id === richMode)?.label} 결과를 찾는 중입니다.</h3><p>공공데이터의 지역별 제공 범위에 따라 결과가 없을 수 있습니다.</p><button type="button" onClick={() => void loadEnrichment()}>다시 조회</button></div>}
            {!enrichmentLoading && richItems.map((spot, index) => <article className="rich-card" key={`${spot.id}-${index}`}>
              <SmartSpotImage src={spot.image} title={spot.title} region={region} tag={spot.tag} rank={index + 1} />
              <section><small>{spot.source}</small><h3>{spot.title}</h3><p>{spot.address || spot.summary || `${region}에서 만나는 ${spot.tag} 여행 정보`}</p><button type="button" disabled={!spot.mapX || !spot.mapY} onClick={() => routeFromRichSpot(spot)}>{spot.mapX && spot.mapY ? "지도에서 경로 보기" : "위치 정보 확인 중"}<span>↗</span></button></section>
            </article>)}
          </div>
        </div>
      </section>

      <section className="navigation-section" id="navigation">
        <div className="workspace-heading" data-reveal>
          <div><span>02</span><h2>{t("navigationTitle", "통합 길찾기")}</h2></div>
          <p>시간 · 요금 · 환승 · 도보</p>
        </div>
        <div className="transport-mode-filter" role="tablist" aria-label="교통수단별 결과 필터">
          {transportModes.map((mode) => <button type="button" role="tab" aria-selected={transportMode === mode.id} key={mode.id} className={transportMode === mode.id ? "active" : ""} onClick={() => setTransportMode(mode.id)}><b>{mode.label}</b><small>{mode.description}</small></button>)}
        </div>
        <div className="transport-provider-strip" aria-label="교통 데이터 연결 상태">
          {effectiveProviders.map((provider) => <span key={provider.id} className={provider.state} title={provider.detail || provider.role}><i /> <b>{provider.name}</b><small>{transportStateLabel[provider.state]}</small></span>)}
        </div>
        {transportContext && (transportContext.nearbyStops.length > 0 || transportContext.arrivals.length > 0 || transportContext.korail.length > 0) && <div className="transport-live-rail" aria-live="polite">
          <div><span>도착지 인근 정류장</span><strong>{transportContext.nearbyStops.slice(0, 3).map((item) => item.name).join(" · ") || "조회 중"}</strong></div>
          <div><span>버스 도착</span><strong>{transportContext.arrivals.slice(0, 3).map((item) => `${item.route} ${item.minutes ? `${item.minutes}분` : "운행 중"}`).join(" · ") || "도착 정보 없음"}</strong></div>
          <div><span>KORAIL 운행계획</span><strong>{transportContext.korail.length ? `${transportContext.korail.length}개 열차 응답` : "승인 상태 확인"}</strong></div>
        </div>}
        {transportContext?.datasets?.length ? <div className="transport-dataset-grid" aria-label="승인된 교통 API 데이터 레이어">
            {transportContext.datasets.map((dataset) => <button type="button" aria-pressed={selectedTransportDataset === dataset.id} key={dataset.id} className={`${dataset.state}${selectedTransportDataset === dataset.id ? " selected" : ""}`} onClick={() => { setSelectedTransportDataset(dataset.id); setTransportMode(transportDatasetMeta[dataset.id]?.mode || "all"); }}><i />{dataset.name}<small>{dataset.state === "live" ? "운행 확인" : dataset.state === "ready" ? "이용 가능" : dataset.state === "error" ? "잠시 지연" : "준비 중"}</small></button>)}
        </div> : null}
        {officialBookingLinks.some((link) => (link.modes as readonly string[]).includes(transportMode)) && <div className="official-booking-strip" aria-label="공식 교통 승차권 예매">
          <span><b>공식 예매</b><small>운행정보 확인 후 제공기관에서 결제</small></span>
          {officialBookingLinks.filter((link) => (link.modes as readonly string[]).includes(transportMode)).map((link) => <a key={link.id} href={link.href} target="_blank" rel="noreferrer" onClick={() => void copyBookingRoute(link.label)}><i>↗</i><strong>{link.label}</strong><small>{link.detail} · 출발·도착 복사</small></a>)}
        </div>}
        {transportContext && selectedDataset && <section className="transport-data-panel" aria-live="polite">
          <div className="transport-data-heading"><div><span>운행정보</span><h3>{selectedDataset.name}</h3><p>{transportDatasetMeta[selectedDataset.id]?.description}</p></div><button type="button" onClick={() => activePlaces[0] && void loadRoutes(routeDestination || activePlaces[0])} disabled={routeLoading || privateOrigin}>{routeLoading ? "확인 중" : "현재 조건 다시 확인"}</button></div>
          <div className="transport-data-results" aria-busy={routeLoading}>
            {routeLoading && [0, 1, 2, 3].map((item) => <article className="transport-result-skeleton" key={`transport-skeleton-${item}`} aria-hidden="true"><i /><b /><span /></article>)}
            {!routeLoading && <>
            {selectedDataset.id === "bus-stop" && transportContext.nearbyStops.map((item) => <article key={item.id || item.name}><small>정류장 ID {item.id || "확인 중"}</small><strong>{item.name}</strong><span>도시 코드 {item.cityCode || "—"}</span></article>)}
            {selectedDataset.id === "bus-arrival" && transportContext.arrivals.map((item, index) => <article key={`${item.route}-${index}`}><small>도착 예정</small><strong>{item.route}</strong><span>{item.minutes ? `${item.minutes}분 후` : "운행 중"} · {item.stops ? `${item.stops}개 정류장 전` : "정류장 접근 중"}</span></article>)}
            {(selectedDataset.id === "train" || selectedDataset.id === "korail-plan") && transportContext.korail.map((item, index) => <article key={`${item.trainNo}-${index}`}><small>{item.departureTime || "운행계획"}</small><strong>{item.trainNo || "여객열차"}</strong><span>{item.departure || "출발역"} → {item.arrival || "도착역"}</span></article>)}
            {selectedDataset.id === "express" && <article><small>고속버스 터미널 카탈로그</small><strong>{transportContext.catalog.expressTerminals.toLocaleString()}개</strong><span>전국 터미널 조회 응답</span></article>}
            {selectedDataset.id === "intercity" && <article><small>시외버스 터미널 카탈로그</small><strong>{transportContext.catalog.intercityTerminals.toLocaleString()}개</strong><span>전국 터미널 조회 응답</span></article>}
            {selectedDataset.id === "subway" && <article><small>철도 도시 데이터</small><strong>{transportContext.catalog.trainCities.toLocaleString()}개</strong><span>지역 선택 후 역·노선 조회 가능</span></article>}
            {((selectedDataset.id === "bus-stop" && !transportContext.nearbyStops.length) || (selectedDataset.id === "bus-arrival" && !transportContext.arrivals.length) || ((selectedDataset.id === "train" || selectedDataset.id === "korail-plan") && !transportContext.korail.length)) && <div className="transport-data-empty"><strong>현재 조건의 결과가 없습니다.</strong><span>목적지나 출발지를 바꾼 뒤 다시 조회해 보세요.</span></div>}
            {!["bus-stop", "bus-arrival", "train", "korail-plan", "express", "intercity", "subway"].includes(selectedDataset.id) && <div className="transport-data-empty"><strong>{selectedDataset.state === "live" ? "현재 운행정보를 확인했습니다." : selectedDataset.state === "ready" ? "지역이나 노선을 선택해 주세요." : "제공기관 정보를 잠시 확인하고 있습니다."}</strong><span>도시·노선·정류소·터미널을 선택하면 자세한 운행정보가 표시됩니다.</span></div>}
            </>}
          </div>
        </section>}
        <div className="navigation-workspace" data-reveal>
          <div className="map-panel">
            <div className="map-toolbar"><button type="button" className={pointPicker === "origin" ? "point-active" : "point-button"} onClick={() => setPointPicker((value) => value === "origin" ? null : "origin")}><span>출발 · 눌러서 변경</span><strong>{originLabel}</strong></button><i>→</i><button type="button" className={pointPicker === "destination" ? "point-active" : "point-button"} onClick={() => setPointPicker((value) => value === "destination" ? null : "destination")}><span>도착 · 눌러서 변경</span><strong>{routeDestination?.name || activePlaces[0]?.name || "여행지 선택 전"}</strong></button><button type="button" className="recalculate-button" onClick={() => activePlaces[0] && void loadRoutes(routeDestination || activePlaces[0])} disabled={!activePlaces.length || routeLoading}>{routeLoading ? "경로 확인 중" : "다시 계산"}</button></div>
            {pointPicker && <section className="trip-point-picker" aria-label={pointPicker === "origin" ? "출발지 선택" : "도착지 선택"}>
              <header><div><small>{pointPicker === "origin" ? "START POINT" : "DESTINATION"}</small><strong>{pointPicker === "origin" ? "어디에서 출발할까요?" : "어디로 이동할까요?"}</strong></div><button type="button" onClick={() => setPointPicker(null)} aria-label="선택 창 닫기">×</button></header>
              <div className="trip-point-comparison"><article><small>W.A.V.E 기본 추천</small><strong>{pointPicker === "origin" ? departurePresets[0].name : activePlaces[0]?.name || "검색 후 추천"}</strong><span>{pointPicker === "origin" ? departurePresets[0].detail : activePlaces[0]?.summary || "조건에 맞는 여행지를 계산합니다."}</span></article><article className="selected"><small>내 선택</small><strong>{pointPicker === "origin" ? originLabel : routeDestination?.name || "아직 선택하지 않음"}</strong><span>{pointPicker === "origin" ? "선택한 위치에서 경로 재계산" : "선택 즉시 혼잡·교통정보 갱신"}</span></article></div>
              <form onSubmit={(event) => { event.preventDefault(); void searchLocations(); }}><input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="장소명·역·터미널·관광지를 직접 입력" aria-label="장소 검색" /><button type="submit" disabled={placeSearchLoading || placeQuery.trim().length < 2}>{placeSearchLoading ? "검색 중" : "검색"}</button></form>
              <div className="trip-point-list">
                {pointPicker === "origin" && departurePresets.map((item) => <button type="button" key={item.id} onClick={() => { setOrigin(item.point); setOriginLabel(item.name); setPrivateOrigin(false); if (routeDestination || activePlaces[0]) void loadRoutes(routeDestination || activePlaces[0], item.point, false); setPointPicker(null); }}><i>S</i><span><strong>{item.name}</strong><small>{item.detail}</small></span></button>)}
                {activePlaces.slice(0, 8).map((place, index) => <button type="button" key={`${pointPicker}-${place.id}`} onClick={() => choosePoint(place)}><i>{index + 1}</i><span><strong>{place.name}</strong><small>{place.address || place.summary}</small></span>{index === 0 && <em>W.A.V.E 추천</em>}</button>)}
                {placeSearchResults.map((item) => <button type="button" key={`search-${item.id}`} onClick={() => choosePoint(searchableToPlace(item))}><i>⌕</i><span><strong>{item.name}</strong><small>{item.address || item.category}</small></span><em>직접 검색</em></button>)}
                {!placeSearchLoading && placeQuery && !placeSearchResults.length && <p>검색 버튼을 누르면 입력한 값으로 실제 장소를 찾습니다.</p>}
              </div>
            </section>}
            <RouteMap origin={origin} places={activePlaces.slice(0, 6)} route={activeRoute} crowd={routeDestination ? destinationCrowd : plan?.crowd} crowdPlaceId={(routeDestination || activePlaces[0])?.id} onOriginChange={(point, label) => {
              setOrigin(point); setOriginLabel(label); setPrivateOrigin(label === "현재 위치");
              if (label === "현재 위치") {
                setRouteAlternatives([]);
                setRouteNotice("현재 위치를 지도에 표시했습니다. 좌표는 서버나 저장소로 전송하지 않습니다.");
              } else if (routeDestination || activePlaces[0]) void loadRoutes(routeDestination || activePlaces[0], point, false);
            }} onDestinationChange={(mapPlace: MapPlace) => {
              const known = activePlaces.find((place) => place.id === mapPlace.id);
              const destination: Place = known || {
                id: mapPlace.id, contentTypeId: "12", city: region, name: mapPlace.name, address: mapPlace.address || "지도에서 선택한 위치", summary: mapPlace.summary || "지도에서 직접 선택한 목적지입니다.", image: mapPlace.image || "", mapX: mapPlace.mapX, mapY: mapPlace.mapY, score: mapPlace.score, features: [], details: ["선택한 좌표를 기준으로 교통 경로를 조회합니다."], source: "지도 직접 선택",
              };
              setRouteDestination(destination);
              void loadRoutes(destination);
            }} />
            <div className="map-legend"><span><i className="origin" /> 출발지</span><span><i className="destination" /> 추천 여행지</span><span><i className={activeRoute?.configured ? "real" : "preview"} /> {activeRoute?.configured ? "실제 이동 구간" : "직선 미리보기"}</span></div>
          </div>
          <aside className="route-compare-panel">
            <div className="sort-tabs" role="tablist" aria-label="경로 정렬 기준">
              {([['time', '가장 빠름'], ['fare', '가장 저렴함'], ['transfer', '환승 최소'], ['walk', '걷기 최소']] as const).map(([id, label]) => <button type="button" key={id} className={routeSort === id ? "active" : ""} onClick={() => setRouteSort(id)}>{label}</button>)}
            </div>
            <p className="route-notice" aria-live="polite"><span className={activeRoute?.configured ? "live-dot" : "ready-dot"} />{routeNotice}</p>
            <div className="route-options" aria-busy={routeLoading}>
              {routeLoading && [0, 1, 2].map((item) => <div className="route-option-skeleton" key={`route-skeleton-${item}`} aria-hidden="true"><i /><div><b /><span /></div><em /></div>)}
              {!routeLoading && !sortedRouteAlternatives.length && <div className="route-empty"><span>↗</span><h3>{routeAlternatives.length ? `${activeTransportMode.label} 운행정보를 위에서 확인하세요.` : "경로를 계산할 여행지를 선택하세요."}</h3><p>{routeAlternatives.length ? "TAGO·KORAIL은 운행 데이터를 제공하며, 문 앞까지의 통합 경로는 경로 엔진이 연결된 교통수단만 표시됩니다." : "관광지를 검색한 뒤 카드의 ‘이곳까지 길찾기’를 누르면 비교 결과가 표시됩니다."}</p></div>}
              {!routeLoading && sortedRouteAlternatives.map((item, index) => <button type="button" key={item.id} className={(activeRoute?.id === item.id ? "active " : "") + "route-option"} onClick={() => setActiveRouteId(item.id)}>
                <span className="route-option-rank">{String(index + 1).padStart(2, "0")}</span><div><strong>{item.label}</strong><small>{item.provider || (item.configured ? "실경로" : "미리보기")}</small></div><dl><div><dt>시간</dt><dd>{item.totalTime || "—"}분</dd></div><div><dt>예상 요금</dt><dd>{item.payment !== null ? `${item.payment.toLocaleString()}원` : "확인 중"}</dd></div><div><dt>환승</dt><dd>{item.configured ? `${item.transfers}회` : "—"}</dd></div><div><dt>도보</dt><dd>{item.configured ? `${item.totalWalk}m` : "—"}</dd></div></dl>
                {item.segments.length > 0 && <span className="segment-summary">{item.segments.slice(0, 4).map((segment) => segment.name).join(" → ")}</span>}
              </button>)}
            </div>
          </aside>
        </div>
      </section>

      <section className={`route-section ${plan ? "revealed" : ""}`} id="route">
        <div className="route-intro" data-reveal>
          <div>
            <p className="section-kicker">YOUR W.A.V.E ROUTE</p>
            <span className={`route-status ${plan?.mode ?? "fallback"}`}><i />{plan?.mode === "live" ? "실시간 데이터 반영" : plan?.mode === "partial" ? "일부 데이터 반영" : "코스 미리보기"}</span>
            <h2>{activeProfiles.map((item) => item.label).slice(0, 2).join("·")} 조건으로 찾은<br />{region}의 하루</h2>
            <p>{region} · {activeTheme} · {activeProfiles.map((item) => item.label).join(" · ")}</p>
          </div>
          <div className="route-metrics">
            <div><small>추천 지점</small><strong>{activeStops.length}<em>곳</em></strong></div>
            <div><small>걷기 코스</small><strong>{plan?.course?.distance || "—"}<em>{plan?.course?.distance ? "km" : ""}</em></strong></div>
            <div><small>확인한 정보</small><strong>{liveCount || "—"}<em>{liveCount ? "개" : ""}</em></strong></div>
          </div>
        </div>

        <div className="itinerary-layout" data-reveal>
          <ol className="itinerary-list">
            {activeStops.slice(0, 4).map((stop, index) => (
              <li key={`${stop.title}-${index}`}>
                <span className="stop-time">{["10:30", "12:20", "14:10", "16:00"][index]}</span>
                <i className="stop-line" aria-hidden="true"><b>{index + 1}</b></i>
                <div><small>{stop.source}</small><h3>{stop.title}</h3><p>{stop.note}</p></div>
                <span className="stop-check">✓ 근거 연결</span>
              </li>
            ))}
          </ol>

          <aside className="guide-player" aria-label="관광지 오디오 해설">
            <div className="guide-top"><span>여행지 음성 해설</span><b>{plan?.audio ? "재생 가능" : "준비 중"}</b></div>
            <div className="guide-art"><span className={playing ? "sound playing" : "sound"}><i /><i /><i /><i /><i /></span><strong>{plan?.audio?.audioTitle || "여행지 이야기를\n음성과 대본으로"}</strong><small>{plan?.audio ? "실제 오디 해설 데이터" : "해설이 있는 관광지를 선택하면 연결됩니다."}</small></div>
            <audio ref={audioRef} src={plan?.audio?.audioUrl || undefined} onLoadedMetadata={(event) => setAudioDuration(event.currentTarget.duration || 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={(event) => { const audio = event.currentTarget; setAudioTime(audio.currentTime); setAudioProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0); }} />
            <div className="player-progress"><span style={{ width: `${audioProgress}%` }} /><i style={{ left: `${audioProgress}%` }} /></div>
            <div className="player-time"><span>{formatTime(audioTime)}</span><span>{formatTime(Number(plan?.audio?.playTime || audioDuration || 0))}</span></div>
            <div className="player-controls"><button type="button" aria-label="15초 뒤로" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 15); }}>↶</button><button className="play-main" type="button" onClick={toggleAudio} aria-label={playing ? "일시정지" : "재생"}>{playing ? "Ⅱ" : "▶"}</button><button type="button" aria-label="15초 앞으로" onClick={() => { if (audioRef.current) audioRef.current.currentTime += 15; }}>↷</button></div>
            <button className="transcript-button" type="button" onClick={() => setTranscriptOpen((value) => !value)}>전체 대본 {transcriptOpen ? "접기" : "보기"}<span>청각 정보 지원</span></button>
            {transcriptOpen && <div className="transcript" tabIndex={0}>{plan?.audio?.script || "현재 선택한 여행지의 오디 해설 대본이 없습니다. 실시간 검색 결과에서 해설이 확인되면 이곳에 전체 대본이 표시됩니다."}</div>}
          </aside>
        </div>
        <div className="share-strip" data-reveal>
          <div><span>여행 계획 저장·공유</span><h3>지금 만든 코스를 30일 동안 공유 링크로 보관합니다.</h3><p>로그인 없이 이용할 수 있으며 접근성 프로필은 계정 정보와 결합하지 않습니다.</p></div>
          <button type="button" onClick={sharePlan} disabled={!plan || shareState === "saving"}>{shareState === "saving" ? "링크 만드는 중" : shareState === "done" ? "링크 복사 완료 ✓" : "공유 링크 만들기"}<span>↗</span></button>
          {shareState === "error" && <small>공유 저장을 확인해 주세요.</small>}{shareUrl && <a href={shareUrl}>공유 화면 열기</a>}
        </div>
        {plan?.course && <div className="course-strip" data-reveal><span>두루누비 걷기 코스</span><div><h3>{plan.course.name}</h3><p>{plan.course.summary}</p></div><dl><div><dt>거리</dt><dd>{plan.course.distance}km</dd></div><div><dt>시간</dt><dd>{plan.course.minutes}분</dd></div><div><dt>난이도</dt><dd>{plan.course.level}</dd></div></dl></div>}
      </section>

      <section className="data-section" id="data">
        <div className="data-heading" data-reveal>
          <div><p className="section-kicker">믿을 수 있는 여행 추천</p><h2>왜 이곳을 추천했는지<br />쉽게 보여드려요.</h2></div>
          <p>선택한 지역·관심사·편의 조건과 최신 관광정보를 함께 비교합니다. 제공기관과 확인 시점을 카드에서 바로 확인할 수 있어요.</p>
        </div>
        <div className="api-bento">
          {statuses.map((status, index) => (
            <article className={`api-card card-${index + 1}`} key={status.id} data-reveal>
              <div><span className={`api-state ${status.state}`}><i />{status.state === "live" ? "최신 정보" : status.state === "empty" ? "정보 없음" : status.state === "error" ? "확인 필요" : "검색 전"}</span><small>0{index + 1}</small></div>
              <h3>{status.name}</h3>
              <p>{status.role}</p>
              <footer><span>{status.note}</span><b>{status.count ? `${status.count}건` : "확인 중"}</b></footer>
            </article>
          ))}
          <aside className="trace-card" data-reveal>
            <p>추천이 만들어지는 과정</p>
            <div className="trace-flow"><span>내 여행 조건</span><i>→</i><span>최신 정보 확인</span><i>→</i><span>접근성 비교</span><i>→</i><span>맞춤 코스</span></div>
            <dl><div><dt>여행 지역</dt><dd>경상남도 18개 시·군</dd></div><div><dt>관심사</dt><dd>자연 · 역사 · 레포츠 · 음식</dd></div><div><dt>정보 기준</dt><dd>{plan?.baseYm ? `${plan.baseYm.slice(0, 4)}.${plan.baseYm.slice(4)} 확인` : "검색할 때 최신 정보 확인"}</dd></div><div><dt>개인정보</dt><dd>현재 위치는 기기 안에서만 사용</dd></div></dl>
          </aside>
        </div>
      </section>

      {selectedPlace && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedPlace(null)}>
          <section className="place-modal" role="dialog" aria-modal="true" aria-labelledby="place-modal-title" onMouseDown={(event) => event.stopPropagation()} ref={placeDialogRef}>
            <button className="modal-close" type="button" onClick={() => setSelectedPlace(null)} aria-label="닫기">×</button>
            <div className="modal-visual" style={selectedPlace.image ? { backgroundImage: `linear-gradient(180deg, transparent, rgba(4,25,44,.72)), url("${selectedPlace.image}")` } : undefined}><span>{selectedPlace.city || region}</span><b>{selectedPlace.score}<small>W.A.V.E 적합도</small></b></div>
            <div className="modal-body">
              <p className="section-kicker">ACCESSIBILITY DETAIL</p>
              <h2 id="place-modal-title">{selectedPlace.name}</h2>
              <p>{selectedPlace.address || selectedPlace.summary}</p>
              <ul>{selectedPlace.details.length ? selectedPlace.details.map((detail) => <li key={detail}><span>✓</span>{detail}</li>) : <li><span>i</span>상세 편의정보는 현장 방문 전 운영기관에 다시 확인해 주세요.</li>}</ul>
              <div className="modal-data"><span><small>활용 데이터</small>{selectedPlace.source}</span><span><small>좌표</small>{selectedPlace.mapY && selectedPlace.mapX ? `${selectedPlace.mapY}, ${selectedPlace.mapX}` : "미제공"}</span></div>
              {typeof selectedPlace.confidence === "number" && <div className="modal-confidence"><span><small>정보 확인률</small><b>{selectedPlace.confidence}%</b></span><span><small>확인된 항목</small><b>{selectedPlace.knownFields || 0}개</b></span><span><small>정보 없음</small><b>{selectedPlace.unknownFields || 0}개</b></span></div>}
              <a className="place-external-review" href={`https://map.kakao.com/link/search/${encodeURIComponent(`${selectedPlace.name} ${selectedPlace.address || selectedPlace.city || region}`)}`} target="_blank" rel="noreferrer"><span><b>방문 후기·사진</b><small>카카오 장소 상세에서 최신 이용 후기를 확인합니다.</small></span><i>↗</i></a>
              <button type="button" onClick={() => { toggleSaved(selectedPlace.id); setSelectedPlace(null); }}>여행 보관함에 {saved.includes(selectedPlace.id) ? "빼기" : "담기"}<span>{saved.includes(selectedPlace.id) ? "−" : "+"}</span></button>
              <div className="feedback-box"><label htmlFor="feedback-message">현장 정보가 다른가요?</label><textarea id="feedback-message" value={feedbackText} onChange={(event) => { setFeedbackText(event.target.value); setFeedbackState("idle"); }} placeholder="달라진 접근로·화장실·승강기 정보를 알려주세요." rows={3} /><button type="button" onClick={submitFeedback} disabled={feedbackText.trim().length < 5 || feedbackState === "sending"}>{feedbackState === "sending" ? "접수 중" : feedbackState === "done" ? "접수 완료 ✓" : "정보 수정 제보"}</button>{feedbackState === "error" && <small>제보 저장 상태를 확인해 주세요.</small>}</div>
              <small className="modal-note">W.A.V.E 적합도는 선택 조건과 최신 편의정보의 일치도를 계산한 서비스 지표이며 공식 인증 점수가 아닙니다. 시설 운영상태는 방문 전에 다시 확인해 주세요.</small>
            </div>
          </section>
        </div>
      )}

      <footer className="simple-footer">
        <div className="brand footer-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>W.A.V.E</span></div>
        <div className="footer-notes"><p>누구나 원하는 곳으로, 경남 무장애 여행 길잡이</p><p className="trust-notice">2026 관광데이터 활용 공모전 출품용 독립 서비스이며 한국관광공사·경상남도의 공식 운영 서비스가 아닙니다.</p></div>
        <p className="source">출처: ⓒ한국관광공사 · ⓒ한국관광콘텐츠랩</p>
      </footer>
    </main>
  );
}
