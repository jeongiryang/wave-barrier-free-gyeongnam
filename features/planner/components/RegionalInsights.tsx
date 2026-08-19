import type { EnrichmentData } from "../types";

interface RegionalInsightsProps {
  enrichment: EnrichmentData | null;
  loading: boolean;
  visitorTypes: Array<[string, number]>;
  demandMax: number;
}

export default function RegionalInsights({ enrichment, loading, visitorTypes, demandMax }: RegionalInsightsProps) {
  const visitorMax = Math.max(...visitorTypes.map(([, amount]) => amount), 1);

  return <div className="insight-board" data-reveal aria-busy={loading}>
    <article className="visitor-insight">
      <div className="insight-label"><span>01</span><p>지역 방문 흐름</p></div>
      {loading ? <div className="insight-skeleton" /> : <>
        <strong>{enrichment?.visitor.total ? enrichment.visitor.total.toLocaleString() : "—"}<small>{enrichment?.visitor.total ? "명" : "검색 후 표시"}</small></strong>
        <p>{enrichment?.visitor.startYmd && enrichment?.visitor.endYmd ? `${enrichment.visitor.startYmd}–${enrichment.visitor.endYmd} 지역 방문 흐름` : "지역별 방문자 API의 최신 가용 구간을 확인합니다."}</p>
        <div className="visitor-bars">
          {visitorTypes.length ? visitorTypes.map(([name, value]) => <div key={name}>
            <span>{name}</span>
            <i><b style={{ width: `${Math.max(8, (value / visitorMax) * 100)}%` }} /></i>
            <em>{value.toLocaleString()}</em>
          </div>) : <small>방문 유형별 데이터가 있으면 이곳에 비교 막대로 표시됩니다.</small>}
        </div>
      </>}
    </article>

    <article className="demand-insight">
      <div className="insight-label"><span>02</span><p>관광 수요 지표</p></div>
      <h3>사람들이 지금<br />무엇을 찾는지 봅니다.</h3>
      <div className="demand-list">
        {loading ? <><div className="insight-skeleton short" /><div className="insight-skeleton short" /></> : enrichment?.demand.length ? enrichment.demand.slice(0, 5).map((item) => <div key={`${item.name}-${item.baseYm}`}>
          <span><b>{item.name}</b><em>{item.value.toFixed(1)}</em></span>
          <i><b style={{ width: `${Math.max(5, (item.value / demandMax) * 100)}%` }} /></i>
        </div>) : <p>지역 관광자원 수요지수의 최신 가용월을 조회합니다.</p>}
      </div>
    </article>

    <aside className="layer-principle">
      <span>W.A.V.E 여행 메모</span>
      <strong>많이 찾는 곳과<br />나에게 맞는 곳은<br />다를 수 있어요.</strong>
      <p>수요·방문량은 순위가 아니라 선택의 맥락으로만 사용합니다. 접근성 적합도와 혼잡 예측을 함께 보세요.</p>
    </aside>
  </div>;
}
