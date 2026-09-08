import { officialBookingLinks, transportDatasetMeta } from "../constants";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { TransportProvider } from "../types";
import { useSitePreferences } from "../../../components/SitePreferences";
import { originalLanguage } from "../place-copy";
import { bookingEnglish, datasetName, datasetStatus, providerRole, providerStatus } from "../transport-detail-copy";

export default function TransportProviderDetails({ effectiveProviders, route, onCopyBookingRoute }: {
  effectiveProviders: TransportProvider[];
  route: ReturnType<typeof useRoutePlanning>;
  onCopyBookingRoute: (provider: string) => Promise<void>;
}) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const { transportContext, transportMode, setTransportMode, selectedTransportDataset, setSelectedTransportDataset } = route;
  return <>
    <div className="transport-provider-strip" role="group" aria-label={english ? "Transport information status" : "교통정보 확인 상태"}>
      {effectiveProviders.map((provider) => <span key={provider.id} className={provider.state}><i aria-hidden="true" /><b lang={originalLanguage(providerRole(provider, english))}>{providerRole(provider, english)}</b><small>{providerStatus(provider, english)}</small></span>)}
    </div>
    {transportContext?.datasets?.length ? <div className="transport-dataset-grid" role="group" aria-label={english ? "Transport information to view" : "조회할 교통정보"}>
      {transportContext.datasets.map((dataset) => <button type="button" aria-pressed={selectedTransportDataset === dataset.id} key={dataset.id} className={dataset.state + (selectedTransportDataset === dataset.id ? " selected" : "")} onClick={() => { setSelectedTransportDataset(dataset.id); setTransportMode(transportDatasetMeta[dataset.id]?.mode || "all"); }}><i aria-hidden="true" /><b>{datasetName(dataset.id, english, dataset.name)}</b><small>{datasetStatus(dataset, english)}</small></button>)}
    </div> : null}
    {officialBookingLinks.some((link) => (link.modes as readonly string[]).includes(transportMode)) && <div className="official-booking-strip" aria-label={english ? "Official transport booking" : "공식 교통 승차권 예매"}>
      <span><b>{english ? "Official booking" : "공식 예매"}</b><small>{english ? "Check services and pay with the provider" : "운행정보 확인 후 제공기관에서 결제"}</small></span>
      {officialBookingLinks.filter((link) => (link.modes as readonly string[]).includes(transportMode)).map((link) => {
        const label = english ? bookingEnglish[link.id][0] : link.label;
        return <a key={link.id} href={link.href} target="_blank" rel="noreferrer" onClick={() => void onCopyBookingRoute(label)}><i aria-hidden="true">↗</i><strong>{label}</strong><small>{english ? bookingEnglish[link.id][1] + " · opens a new tab" : link.detail + " · 새 탭"}</small></a>;
      })}
    </div>}
  </>;
}
