import type {
  DestinationCrowd,
  EnrichmentData,
  PlanData,
  RichMode,
  RichSpot,
  WeatherData,
} from "../types";
import type { TripImpact } from "../view-model";
import RegionalInsights from "./RegionalInsights";
import SituationImpactPanel from "./SituationImpactPanel";
import ThemeExplorer from "./ThemeExplorer";
import WeatherBoard from "./WeatherBoard";

interface TravelSignalsPanelProps {
  region: string;
  plan: PlanData | null;
  weather: WeatherData | null;
  weatherLoading: boolean;
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
  onRouteFromRichSpot: (spot: RichSpot) => void;
}

export default function TravelSignalsPanel({
  region,
  plan,
  weather,
  weatherLoading,
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
  onRouteFromRichSpot,
}: TravelSignalsPanelProps) {
  return <section className="travel-layers" id="layers">
    <div className="workspace-heading inverse" data-reveal>
      <div><span>03</span><h2>{region} 상황과 여행 정보</h2></div>
      <p>방문 · 수요 · 테마</p>
    </div>

    <WeatherBoard region={region} weather={weather} loading={weatherLoading} />
    {plan && <SituationImpactPanel
      tripImpact={tripImpact}
      impactCrowd={impactCrowd}
      weather={weather}
      weatherLoading={weatherLoading}
      onImpactAction={onImpactAction}
    />}
    <RegionalInsights
      enrichment={enrichment}
      loading={enrichmentLoading}
      visitorTypes={visitorTypes}
      demandMax={demandMax}
    />
    <ThemeExplorer
      region={region}
      loading={enrichmentLoading}
      richMode={richMode}
      onRichModeChange={onRichModeChange}
      richItems={richItems}
      onReload={onReloadEnrichment}
      onRouteFromSpot={onRouteFromRichSpot}
    />
  </section>;
}
