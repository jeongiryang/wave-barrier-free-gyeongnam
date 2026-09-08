import type { TransportProvider } from "../types";
import { transitDetail } from "../transit-detail";

export default function TransitProviderNotice({ provider, english }: { provider: TransportProvider; english: boolean }) {
  return <p className="route-notice" lang={english ? "en" : "ko"} role="status">{transitDetail(provider.detail || "", english, provider.failure)}</p>;
}
