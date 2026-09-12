import LoadingState from "../../../components/LoadingState";
import { lazy, Suspense, useState } from "react";
import type { useRoutePlanning } from "../hooks/useRoutePlanning";
import type { Place, TransportProvider } from "../types";
import { useSitePreferences } from "../../../components/SitePreferences";
import TransportModeSelector from "./TransportModeSelector";

function DetailsUnavailable() {
  const { locale } = useSitePreferences();
  return <div className="transport-data-empty"><p role="status">{locale === "en" ? "Transport details could not open. Your itinerary is still available." : "교통 상세 화면을 열지 못했습니다. 일정은 그대로 이용할 수 있습니다."}</p><button type="button" onClick={() => window.location.reload()}>{locale === "en" ? "Reload this page" : "페이지 새로고침"}</button></div>;
}
const TransportDetailsContents = lazy(() => import("./TransportDetailsContents").catch(() => ({ default: DetailsUnavailable })));

export interface TransportDataOverviewProps {
  activePlaces: Place[];
  effectiveProviders: TransportProvider[];
  route: ReturnType<typeof useRoutePlanning>;
  onCopyBookingRoute: (provider: string) => Promise<void>;
}

export default function TransportDataOverview(props: TransportDataOverviewProps) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const [open, setOpen] = useState(false);
  return <>
    <TransportModeSelector route={props.route} />
    <details className="transport-details" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>{english ? "Transport details" : "교통정보 상세"} <span>{english ? "Current information and official booking" : "현재 정보와 공식 예매"}</span></summary>
      {open && <Suspense fallback={<LoadingState>{english ? "Opening transport details…" : "교통 상세를 여는 중입니다…"}</LoadingState>}><TransportDetailsContents {...props} /></Suspense>}
    </details>
  </>;
}
