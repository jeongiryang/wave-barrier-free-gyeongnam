import { readyStatuses } from "./constants";
import type {
  DestinationCrowd,
  EnrichmentData,
  KeyHealth,
  Place,
  PlanData,
  RichMode,
  TransportProvider,
  TransportProviderState,
  WeatherData,
} from "./types";
import { assessTripImpact } from "../../lib/trip-impact.js";

const fallbackProviderDefinitions = [
  { id: "kakao-drive", name: "KAKAO DRIVE", role: "자동차 시간·거리·통행료", key: "kakao-route" },
  { id: "odsay", name: "ODsay", role: "대중교통 경로", key: "odsay" },
  { id: "korail", name: "KORAIL", role: "여객열차 운행계획", key: "public-transport" },
  { id: "tago-bus-stop", name: "TAGO BUS", role: "목적지 주변 버스정류장", key: "public-transport" },
  { id: "tago-bus-arrival", name: "TAGO ARRIVAL", role: "가까운 정류장 도착 예정", key: "public-transport" },
  { id: "tago-rail-catalog", name: "TAGO RAIL", role: "철도 지역코드", key: "public-transport" },
  { id: "tago-express-catalog", name: "TAGO EXPRESS", role: "고속버스 터미널", key: "public-transport" },
  { id: "tago-intercity-catalog", name: "TAGO INTERCITY", role: "시외버스 터미널", key: "public-transport" },
] as const;

export function buildFallbackTransportProviders(
  keyHealth: KeyHealth | null,
  keyHealthChecked: boolean,
): TransportProvider[] {
  const stateOf = (id: string): TransportProviderState => {
    if (!keyHealth) return keyHealthChecked ? "error" : "checking";
    return keyHealth.keys.find((key) => key.id === id)?.state === "configured" ? "ready" : "missing";
  };

  return fallbackProviderDefinitions.map(({ key, ...provider }) => {
    const state = stateOf(key);
    return { ...provider, configured: state === "ready", state };
  });
}

interface PlannerViewModelInput {
  plan: PlanData | null;
  enrichment: EnrichmentData | null;
  richMode: RichMode;
  weather: WeatherData | null;
  travelStart: string;
  theme: string;
  activePlaces: Place[];
  routeDestination: Place | null;
  destinationCrowd: DestinationCrowd | null;
  transportProviders: TransportProvider[];
  keyHealth: KeyHealth | null;
  keyHealthChecked: boolean;
}

export function buildPlannerViewModel({
  plan,
  enrichment,
  richMode,
  weather,
  travelStart,
  theme,
  activePlaces,
  routeDestination,
  destinationCrowd,
  transportProviders,
  keyHealth,
  keyHealthChecked,
}: PlannerViewModelInput) {
  const statuses = plan ? [...plan.statuses, ...(enrichment?.statuses || [])] : readyStatuses;
  const fallbackProviders = buildFallbackTransportProviders(keyHealth, keyHealthChecked);
  const effectiveProviders = transportProviders.length ? transportProviders : fallbackProviders;
  const travelWeather = weather?.days.find((day) => day.date === travelStart) ?? null;
  const impactDestination = routeDestination ?? activePlaces[0] ?? null;
  const impactAlternative = activePlaces.find((place) => place.id !== impactDestination?.id) ?? null;
  const impactCrowd = destinationCrowd ?? plan?.crowd ?? null;

  return {
    activeStops: plan?.stops ?? [],
    statuses,
    liveCount: statuses.filter((status) => status.state === "live").length,
    effectiveProviders,
    providerErrors: transportProviders.filter((item) => item.state === "error").length,
    dataErrors: statuses.filter((status) => status.state === "error").length,
    richItems: enrichment?.[richMode] ?? [],
    visitorTypes: Object.entries(enrichment?.visitor.byType ?? {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4),
    demandMax: Math.max(...(enrichment?.demand.map((item) => item.value) ?? [0]), 1),
    impactAlternative,
    impactCrowd,
    tripImpact: assessTripImpact({
      weatherDay: travelWeather,
      current: weather?.current,
      crowd: impactCrowd,
      theme,
      destination: impactDestination?.name,
      alternative: impactAlternative?.name,
    }),
  };
}

export type PlannerViewModel = ReturnType<typeof buildPlannerViewModel>;
export type TripImpact = PlannerViewModel["tripImpact"];
