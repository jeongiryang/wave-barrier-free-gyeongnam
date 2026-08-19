import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, TransportProvider } from "../types";
import TransportDatasetPanel from "./TransportDatasetPanel";
import TransportModeSelector from "./TransportModeSelector";
import TransportProviderDetails from "./TransportProviderDetails";

interface TransportDataOverviewProps {
  activePlaces: Place[];
  effectiveProviders: TransportProvider[];
  route: ReturnType<typeof useRoutePlanning>;
  onCopyBookingRoute: (provider: string) => Promise<void>;
}

export default function TransportDataOverview({ activePlaces, effectiveProviders, route, onCopyBookingRoute }: TransportDataOverviewProps) {
  return <>
    <TransportModeSelector route={route} />
    <TransportProviderDetails effectiveProviders={effectiveProviders} route={route} onCopyBookingRoute={onCopyBookingRoute} />
    <TransportDatasetPanel activePlaces={activePlaces} route={route} />
  </>;
}
