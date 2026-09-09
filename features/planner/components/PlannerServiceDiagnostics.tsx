import type { PlannerServiceStatusProps } from "./PlannerServiceStatus";

export default function PlannerServiceDiagnostics({ keyHealth, effectiveProviders, transportProviders, providerErrors, liveCount, dataErrors, plan }: PlannerServiceStatusProps) {
  const connectedTransportCount = effectiveProviders.filter(item => item.state === "connected").length;
  const readyTransportCount = effectiveProviders.filter(item => item.state === "ready").length;
  return (
    <section className="connection-diagnostics" aria-label="서비스 상태 상세">
      <header><div><span>진단 정보</span><h3>관광·지도·교통정보 이용 상태</h3></div><p>{keyHealth?.checkedAt ? `확인 ${new Date(keyHealth.checkedAt).toLocaleString("ko-KR")}` : "확인 중"}</p></header>
      <div className="diagnostic-grid">
        {(keyHealth?.keys || []).map((item) => <article key={item.id} className={item.state}><i /><div><strong>{item.name}</strong><p>{item.note}</p></div><span>{item.state === "configured" ? "이용 가능" : item.state === "optional" ? "선택 기능" : "준비 필요"}</span></article>)}
      </div>
      <footer><p><b>교통정보:</b> {transportProviders.length ? `직접 확인 ${connectedTransportCount}개 · 조회 준비 ${readyTransportCount}개 · 지연 ${providerErrors}개` : "여행지를 선택하면 교통정보를 확인합니다."}</p><p><b>관광정보:</b> {plan ? `최신 정보 ${liveCount}개 · 확인 필요 ${dataErrors}개` : "코스를 찾으면 제공기관별 확인 상태를 보여드려요."}</p><p>인증키 연결과 실제 시간·운행정보 확인은 다른 상태입니다. 일부 제공기관은 조회 조건에 따라 결과가 없을 수 있습니다.</p></footer>
    </section>
  );
}
