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
  return <details className="journey-workspace-block travel-layers" id="layers" suppressHydrationWarning onToggle={(event) => onSecondaryOpenChange(event.currentTarget.open)}>
    <summary><span>날씨·혼잡과 주변 정보 자세히 보기</span><small>선택 사항 · 일정에 영향을 줄 때만 확인하세요.</small></summary>
    {secondaryOpen && <div className="travel-signal-content">
      <WeatherBoard region={region} weather={weather} loading={weatherLoading} />
      {plan && <SituationImpactPanel
        tripImpact={tripImpact}
        impactCrowd={impactCrowd}
        weather={weather}
        weatherLoading={weatherLoading}
        onImpactAction={onImpactAction}
      />}
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
