import type { TransportDataOverviewProps } from "./TransportDataOverview";
import TransportProviderDetails from "./TransportProviderDetails";
import TransportDatasetPanel from "./TransportDatasetPanel";

export default function TransportDetailsContents(props: TransportDataOverviewProps) {
  return <>
    <TransportProviderDetails effectiveProviders={props.effectiveProviders} route={props.route} onCopyBookingRoute={props.onCopyBookingRoute} />
    <TransportDatasetPanel activePlaces={props.activePlaces} route={props.route} />
  </>;
}
