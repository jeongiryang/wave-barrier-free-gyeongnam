import { officialBookingLinks, transportDatasetMeta, transportStateLabel } from "../constants";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { TransportProvider } from "../types";

export default function TransportProviderDetails({ effectiveProviders, route, onCopyBookingRoute }: {
  effectiveProviders: TransportProvider[];
  route: ReturnType<typeof useRoutePlanning>;
  onCopyBookingRoute: (provider: string) => Promise<void>;
}) {
  const { transportContext, transportMode, setTransportMode, selectedTransportDataset, setSelectedTransportDataset } = route;
  return <>
      <div className="transport-provider-strip" aria-label="교통정보 확인 상태">
        {effectiveProviders.map((provider) => <span key={provider.id} className={provider.state} title={provider.detail || provider.role}><i /> <b>{provider.role}</b><small>{transportStateLabel[provider.state]}</small></span>)}
      </div>
      {transportContext?.datasets?.length ? <div className="transport-dataset-grid" aria-label="교통정보 데이터 범위">
        {transportContext.datasets.map((dataset) => <button type="button" aria-pressed={selectedTransportDataset === dataset.id} key={dataset.id} className={`${dataset.state}${selectedTransportDataset === dataset.id ? " selected" : ""}`} onClick={() => { setSelectedTransportDataset(dataset.id); setTransportMode(transportDatasetMeta[dataset.id]?.mode || "all"); }}><i />{dataset.name}<small>{dataset.state === "live" ? "운행 확인" : dataset.state === "ready" ? "이용 가능" : dataset.state === "error" ? "잠시 지연" : "준비 중"}</small></button>)}
      </div> : null}
    {officialBookingLinks.some((link) => (link.modes as readonly string[]).includes(transportMode)) && <div className="official-booking-strip" aria-label="공식 교통 승차권 예매">
      <span><b>공식 예매</b><small>운행정보 확인 후 제공기관에서 결제</small></span>
      {officialBookingLinks.filter((link) => (link.modes as readonly string[]).includes(transportMode)).map((link) => <a key={link.id} href={link.href} target="_blank" rel="noreferrer" onClick={() => void onCopyBookingRoute(link.label)}><i>↗</i><strong>{link.label}</strong><small>{link.detail} · 출발·도착 복사</small></a>)}
    </div>}
  </>;
}
