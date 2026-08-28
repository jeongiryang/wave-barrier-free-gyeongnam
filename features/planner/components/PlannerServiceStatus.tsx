import type { KeyHealth, PlanData, TransportProvider } from "../types";

interface PlannerServiceStatusProps {
  locale: string;
  open: boolean;
  onToggle: () => void;
  keyHealth: KeyHealth | null;
  effectiveProviders: TransportProvider[];
  transportProviders: TransportProvider[];
  providerErrors: number;
  liveCount: number;
  dataErrors: number;
  plan: PlanData | null;
}

export default function PlannerServiceStatus({
  locale,
  open,
  onToggle,
  keyHealth,
  effectiveProviders,
  transportProviders,
  providerErrors,
  liveCount,
  dataErrors,
  plan,
}: PlannerServiceStatusProps) {
  return <section className="planner-service-status" aria-labelledby="planner-service-status-title">
    <div className="planner-service-status-bar">
      <div><span>SERVICE STATUS</span><h2 id="planner-service-status-title">여행정보 연결 상태</h2></div>
      <div className="tool-launch-status"><span><i /> 관광정보 {liveCount ? "확인됨" : "준비"}</span><span><i /> 교통정보 {effectiveProviders.some((item) => item.configured) ? "확인됨" : "준비"}</span><span>{locale.toUpperCase()}</span><button type="button" aria-expanded={open} onClick={onToggle}>자세히 보기<b>{open ? "−" : "+"}</b></button></div>
    </div>

    {open && <section className="connection-diagnostics" aria-label="서비스 상태 상세">
      <header><div><span>SERVICE STATUS</span><h3>관광·지도·교통정보 이용 상태</h3></div><p>{keyHealth?.checkedAt ? `확인 ${new Date(keyHealth.checkedAt).toLocaleString("ko-KR")}` : "확인 중"}</p></header>
      <div className="diagnostic-grid">
        {(keyHealth?.keys || []).map((item) => <article key={item.id} className={item.state}><i /><div><strong>{item.name}</strong><p>{item.note}</p></div><span>{item.state === "configured" ? "이용 가능" : item.state === "optional" ? "선택 기능" : "준비 필요"}</span></article>)}
      </div>
      <footer><p><b>교통정보:</b> {transportProviders.length ? `${transportProviders.filter((item) => item.state === "connected").length}개 제공기관 확인 · 지연 ${providerErrors}개` : "여행지를 선택하면 교통정보를 확인합니다."}</p><p><b>관광정보:</b> {plan ? `최신 정보 ${liveCount}개 · 확인 필요 ${dataErrors}개` : "코스를 찾으면 제공기관별 확인 상태를 보여드려요."}</p><p>일부 운행정보는 제공기관의 조회 조건에 따라 결과가 없을 수 있습니다.</p></footer>
    </section>}
  </section>;
}
