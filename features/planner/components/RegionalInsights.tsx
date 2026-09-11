import type { EnrichmentData } from "../types";
import { useSitePreferences } from "../../../components/SitePreferences";
import { originalLanguage } from "../place-copy";

interface RegionalInsightsProps {
  enrichment: EnrichmentData | null;
  loading: boolean;
  visitorTypes: Array<[string, number]>;
  demandMax: number;
}

export default function RegionalInsights({ enrichment, loading, visitorTypes, demandMax }: RegionalInsightsProps) {
  const { locale } = useSitePreferences();
  const english = locale === "en";
  const visitorMax = Math.max(...visitorTypes.map(([, amount]) => amount), 1);
  const visitor = enrichment?.visitor;
  const hasVisitors = Boolean(visitor && (visitor.total > 0 || visitorTypes.length > 0 || enrichment?.statuses.some(status => status.id === "visitor" && status.count > 0)));

  return <div className="insight-board" data-reveal aria-busy={loading}>
    <article className="visitor-insight">
      <div className="insight-label"><span>01</span><p>{english ? "Regional visitors" : "지역 방문 흐름"}</p></div>
      {loading ? <div className="insight-skeleton" /> : <>
        {hasVisitors && visitor ? <strong>{visitor.total.toLocaleString(english ? "en-US" : "ko-KR")}<span className="visitor-unit">{english ? "visits" : "명"}</span></strong> : <h3 className="visitor-empty">{english ? "Visitor figures are not available yet." : "아직 제공되지 않은\n방문 통계입니다."}</h3>}
        <p>{visitor?.startYmd && visitor?.endYmd ? `${visitor.startYmd}–${visitor.endYmd} ${english ? "regional visitor data" : "지역 방문 흐름"}` : english ? "The latest period supplied for this region appears here." : "지역별 방문 통계의 최신 제공 구간을 확인합니다."}</p>
        <div className="visitor-bars">
          {visitorTypes.length ? visitorTypes.map(([name, value]) => <div key={name}>
            <span lang={originalLanguage(name)}>{name}</span>
            <i><b style={{ width: `${Math.max(0, (value / visitorMax) * 100)}%` }} /></i>
            <em>{value.toLocaleString()}</em>
          </div>) : <small>{english ? "Visitor groups will appear when data is supplied. Unavailable figures do not mean zero visits." : "방문 유형별 자료가 제공되면 비교할 수 있습니다. 미제공은 방문자가 0명이라는 뜻이 아닙니다."}</small>}
        </div>
      </>}
    </article>

    <article className="demand-insight">
      <div className="insight-label"><span>02</span><p>{english ? "Tourism demand" : "관광 수요 지표"}</p></div>
      <h3>{english ? "What are travellers looking for?" : <>사람들이 지금<br />무엇을 찾는지 봅니다.</>}</h3>
      <div className="demand-list">
        {loading ? <><div className="insight-skeleton short" /><div className="insight-skeleton short" /></> : enrichment?.demand.length ? enrichment.demand.slice(0, 5).map((item) => <div key={`${item.name}-${item.baseYm}`}>
          <span><b lang={originalLanguage(item.name)}>{item.name}</b><em>{item.value.toFixed(1)}</em></span>
          <i><b style={{ width: `${Math.max(0, (item.value / demandMax) * 100)}%` }} /></i>
        </div>) : <p>{english ? "The latest available monthly demand index appears here when supplied." : "지역 관광자원 수요지수의 최신 가용월 자료가 제공되면 표시합니다."}</p>}
      </div>
    </article>

    <aside className="layer-principle">
      <span>{english ? "A WAVE travel note" : "WAVE 여행 메모"}</span>
      <strong>{english ? "A popular place can be different from the right place for you." : <>많이 찾는 곳과<br />나에게 맞는 곳은<br />다를 수 있어요.</>}</strong>
      <p>{english ? "Use demand and visitor numbers as context. Check facility information and visitor concentration forecasts alongside them." : "수요·방문량은 선택의 맥락으로만 사용합니다. 편의시설 정보와 혼잡 예측을 함께 보세요."}</p>
    </aside>
  </div>;
}
