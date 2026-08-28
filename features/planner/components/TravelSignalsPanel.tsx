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
import WeatherBoard from "./WeatherBoard";

const PlannerSecondaryInsights = lazy(() => import("./PlannerSecondaryInsights"));

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
  secondaryOpen: boolean;
  onSecondaryOpenChange: (open: boolean) => void;
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
  secondaryOpen,
  onSecondaryOpenChange,
  onRouteFromRichSpot,
}: TravelSignalsPanelProps) {
  return <div className="journey-workspace-block travel-layers" id="layers">
    <div className="journey-subheading inverse" data-reveal>
      <div><span>STEP 04</span><h3>{region} 상황과 여행 정보</h3></div>
      <p>날씨 · 방문 경향 · 주변</p>
    </div>

    <WeatherBoard region={region} weather={weather} loading={weatherLoading} />
    {plan && <SituationImpactPanel
      tripImpact={tripImpact}
      impactCrowd={impactCrowd}
      weather={weather}
      weatherLoading={weatherLoading}
      onImpactAction={onImpactAction}
    />}
    <details className="planner-secondary-details" open={secondaryOpen} onToggle={(event) => onSecondaryOpenChange(event.currentTarget.open)}>
      <summary><span>주변 여행 정보 펼치기</span><small>방문 경향 · 축제 · 숙박 · 테마 여행</small></summary>
      {secondaryOpen && <Suspense fallback={<div className="planner-secondary-loading" role="status">주변 여행 정보를 준비하고 있어요.</div>}>
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
      </Suspense>}
    </details>
  </div>;
}
