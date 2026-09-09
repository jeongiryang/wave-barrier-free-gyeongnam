import type {
  DestinationCrowd,
  EnrichmentData,
  PlanData,
  RichMode,
  RichSpot,
  WeatherData,
} from "../types";
import type { TripImpact } from "../view-model";
import { lazy, Suspense } from "react";
import SituationImpactPanel from "./SituationImpactPanel";
import { useSitePreferences } from "../../../components/SitePreferences";

function WeatherUnavailable() {
  const { locale } = useSitePreferences();
  return <div role="status"><p>{locale === "en" ? "The weather view could not open. Your itinerary is still available." : "날씨 화면을 열지 못했습니다. 일정은 그대로 이용할 수 있습니다."}</p><button type="button" onClick={() => window.location.reload()}>{locale === "en" ? "Reload this page" : "페이지 새로고침"}</button></div>;
}
const WeatherBoard = lazy(() => import("./WeatherBoard").catch(() => ({ default: WeatherUnavailable })));

const PlannerSecondaryInsights = lazy(() => import("./PlannerSecondaryInsights"));

interface TravelSignalsPanelProps {
  region: string;
  plan: PlanData | null;
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherFailure?: import("../../../lib/provider-failure.js").ProviderFailure;
  onReloadWeather: () => void;
  tripImpact: TripImpact;
  impactCrowd: DestinationCrowd | null;
  onImpactAction: (action: "culture" | "alternative") => void;
  enrichment: EnrichmentData | null;
  enrichmentLoading: boolean;
  visitorTypes: Array<[string, number]>;
  demandMax: number;
  richMode: RichMode;
  onRichModeChange: (mode: RichMode) => void;
  richItems: RichSpot[];
  onReloadEnrichment: () => void;
  secondaryOpen: boolean;
  onSecondaryOpenChange: (open: boolean) => void;
  onRouteFromRichSpot: (spot: RichSpot) => void;
}

export default function TravelSignalsPanel({
  region,
  plan,
  weather,
  weatherLoading,
  weatherFailure,
  onReloadWeather,
  tripImpact,
  impactCrowd,
  onImpactAction,
  enrichment,
  enrichmentLoading,
  visitorTypes,
  demandMax,
  richMode,
  onRichModeChange,
  richItems,
  onReloadEnrichment,
  secondaryOpen,
  onSecondaryOpenChange,
  onRouteFromRichSpot,
}: TravelSignalsPanelProps) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  return <details open={secondaryOpen} className="journey-workspace-block travel-layers" id="layers" suppressHydrationWarning onToggle={(event) => { if (secondaryOpen !== event.currentTarget.open) onSecondaryOpenChange(event.currentTarget.open); }}>
    <summary><span>{english ? "Weather, visitor forecasts and nearby information" : "날씨·혼잡과 주변 정보 자세히 보기"}</span><small>{english ? "Optional · check when it affects your itinerary." : "선택 사항 · 일정에 영향을 줄 때만 확인하세요."}</small></summary>
    {secondaryOpen && <div className="travel-signal-content">
      <Suspense fallback={<p role="status">{english ? "Opening weather…" : "날씨 화면을 여는 중입니다…"}</p>}><WeatherBoard region={region} weather={weather} failure={weatherFailure} loading={weatherLoading} onReload={onReloadWeather} /></Suspense>
      <div id="crowd">{plan ? <SituationImpactPanel
        tripImpact={tripImpact}
        impactCrowd={impactCrowd}
        weather={weather}
        weatherLoading={weatherLoading}
        onImpactAction={onImpactAction}
      /> : <section><h3>{english ? "Visitor concentration forecast" : "관광 집중률 예측"}</h3><p>{english ? "No forecast has been checked for this itinerary. Review your trip preferences and search again to check current information." : "현재 일정의 관광 집중률은 아직 조회하지 않았습니다. 여행 조건을 확인하고 다시 검색하면 현재 정보를 확인할 수 있습니다."}</p></section>}</div>
      <Suspense fallback={<div className="planner-secondary-loading" role="status">주변 여행 정보를 준비하고 있어요.</div>}>
        <PlannerSecondaryInsights
          region={region}
          enrichment={enrichment}
          enrichmentLoading={enrichmentLoading}
          visitorTypes={visitorTypes}
          demandMax={demandMax}
          richMode={richMode}
          onRichModeChange={onRichModeChange}
          richItems={richItems}
          onReloadEnrichment={onReloadEnrichment}
          onRouteFromRichSpot={onRouteFromRichSpot}
        />
      </Suspense>
    </div>}
  </details>;
}
