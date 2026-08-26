import type { EnrichmentData, RichMode, RichSpot } from "../types";
import RegionalInsights from "./RegionalInsights";
import ThemeExplorer from "./ThemeExplorer";

export default function PlannerSecondaryInsights({
  region,
  enrichment,
  enrichmentLoading,
  visitorTypes,
  demandMax,
  richMode,
  onRichModeChange,
  richItems,
  onReloadEnrichment,
  onRouteFromRichSpot,
}: {
  region: string;
  enrichment: EnrichmentData | null;
  enrichmentLoading: boolean;
  visitorTypes: Array<[string, number]>;
  demandMax: number;
  richMode: RichMode;
  onRichModeChange: (mode: RichMode) => void;
  richItems: RichSpot[];
  onReloadEnrichment: () => void;
  onRouteFromRichSpot: (spot: RichSpot) => void;
}) {
  return <div className="planner-secondary-content">
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
  </div>;
}
