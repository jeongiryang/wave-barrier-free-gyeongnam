import SmartSpotImage from "../../../components/SmartSpotImage";
import { richCatalog } from "../constants";
import type {
  DestinationCrowd,
  EnrichmentData,
  PlanData,
  RichMode,
  RichSpot,
  WeatherData,
} from "../types";
import type { TripImpact } from "../view-model";

interface TravelSignalsPanelProps {
  region: string;
  plan: PlanData | null;
  weather: WeatherData | null;
  weatherLoading: boolean;
  tripImpact: TripImpact;
  impactCrowd: DestinationCrowd | null;
  onImpactAction: (action: "culture" | "alternative") => void;
  enrichment: EnrichmentData | null;
  enrichmentLoading: boolean;
  visitorTypes: Array<[string, number]>;
  demandMax: number;
  richMode: RichMode;
  onRichModeChange: (mode: RichMode) => void;
  richItems: RichSpot[];
  onReloadEnrichment: () => void;
  onRouteFromRichSpot: (spot: RichSpot) => void;
}

export default function TravelSignalsPanel({
  region,
  plan,
  weather,
  weatherLoading,
  tripImpact,
  impactCrowd,
  onImpactAction,
  enrichment,
  enrichmentLoading,
  visitorTypes,
  demandMax,
  richMode,
  onRichModeChange,
  richItems,
  onReloadEnrichment,
  onRouteFromRichSpot,
}: TravelSignalsPanelProps) {
  const visitorMax = Math.max(...visitorTypes.map(([, amount]) => amount), 1);

  return <section className="travel-layers" id="layers">
    <div className="workspace-heading inverse" data-reveal>
      <div><span>03</span><h2>{region} 상황과 여행 정보</h2></div>
      <p>방문 · 수요 · 테마</p>
    </div>

    <section className="weather-board" data-reveal aria-busy={weatherLoading} aria-label={`${region} 여행 날씨`}>
      {weatherLoading && <><div className="weather-current weather-skeleton"><i /><b /><span /></div><div className="weather-days">{[0,1,2,3,4,5,6].map((item) => <div className="weather-day weather-skeleton" key={item}><i /><b /><span /></div>)}</div></>}
      {!weatherLoading && weather && <>
        <div className="weather-current"><small>현재 여행 날씨 · {weather.source}</small><div><span className={`weather-symbol code-${weather.current.code}`} aria-hidden="true" /><strong>{Math.round(weather.current.temperature)}°</strong><p><b>{weather.current.label}</b><span>체감 {Math.round(weather.current.apparent)}° · 바람 {weather.current.wind.toFixed(1)}km/h</span></p></div><ul>{weather.advice.map((item) => <li key={item}>{item}</li>)}</ul></div>
        <div className="weather-days">{weather.days.map((day, index) => <article className="weather-day" key={day.date}><small>{index === 0 ? "오늘" : new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(`${day.date}T12:00:00`))}</small><span className={`weather-symbol code-${day.code}`} aria-hidden="true" /><strong>{Math.round(day.max)}° <em>{Math.round(day.min)}°</em></strong><p>비 {Math.round(day.rainProbability)}% · UV {day.uv.toFixed(0)}</p>{day.snow > 0 && <b>눈 {day.snow.toFixed(1)}cm</b>}</article>)}</div>
      </>}
      {!weatherLoading && !weather && <div className="weather-empty"><strong>예보를 잠시 불러오지 못했습니다.</strong><span>관광 데이터와 경로 기능은 그대로 이용할 수 있어요.</span></div>}
    </section>

    {plan && <section className={`impact-response ${tripImpact.level}`} data-reveal aria-labelledby="impact-response-title">
      <p className="sr-only" role="status" aria-live="polite">{tripImpact.headline}</p>
      <header>
        <div><small>상황 감지 → 일정 영향 → 대안</small><h3 id="impact-response-title">{tripImpact.headline}</h3></div>
        <span className={`impact-level ${tripImpact.level}`}><i />{tripImpact.level === "critical" ? "변경 권장" : tripImpact.level === "warning" ? "대안 확인" : tripImpact.level === "watch" ? "준비 보완" : "일정 유지"}</span>
      </header>
      <div className="impact-signal-grid">
        {tripImpact.signals.map((signal, index) => <article className={signal.level} key={signal.id}>
          <span><b>{String(index + 1).padStart(2, "0")}</b>{signal.label}</span>
          <strong>{signal.title}</strong>
          <p>{signal.detail}</p>
        </article>)}
        <article className="action-card">
          <span><b>{String(tripImpact.signals.length + 1).padStart(2, "0")}</b>지금 할 수 있는 일</span>
          <strong>{tripImpact.actions.length ? "조건을 유지하면서 대안을 바로 비교합니다." : "현재 일정과 이동 경로를 계속 확인하세요."}</strong>
          <div className="impact-actions">
            {tripImpact.actions.map((action) => <button type="button" key={action.id} onClick={() => onImpactAction(action.id as "culture" | "alternative")}>{action.label}<i aria-hidden="true">→</i></button>)}
            {!tripImpact.actions.length && <button type="button" onClick={() => document.getElementById("navigation")?.scrollIntoView({ behavior: "smooth" })}>이동 경로 확인<i aria-hidden="true">→</i></button>}
          </div>
        </article>
      </div>
      <footer>
        <span>날씨: {weather?.source || (weatherLoading ? "조회 중" : "조회 실패")}{weather?.updatedAt ? ` · ${new Date(weather.updatedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 조회` : ""}</span>
        <span>{impactCrowd ? `관광 집중률: 한국관광공사 예측값 · 기준 ${impactCrowd.baseYmd || "최신값"} · 정확한 실시간 방문자 수가 아닙니다.` : "관광 집중률: 조회하지 못함 · 추천 장소와 경로는 계속 이용할 수 있습니다."}</span>
      </footer>
    </section>}

    <div className="insight-board" data-reveal aria-busy={enrichmentLoading}>
      <article className="visitor-insight">
        <div className="insight-label"><span>01</span><p>지역 방문 흐름</p></div>
        {enrichmentLoading ? <div className="insight-skeleton" /> : <>
          <strong>{enrichment?.visitor.total ? enrichment.visitor.total.toLocaleString() : "—"}<small>{enrichment?.visitor.total ? "명" : "검색 후 표시"}</small></strong>
          <p>{enrichment?.visitor.startYmd && enrichment?.visitor.endYmd ? `${enrichment.visitor.startYmd}–${enrichment.visitor.endYmd} 지역 방문 흐름` : "지역별 방문자 API의 최신 가용 구간을 확인합니다."}</p>
          <div className="visitor-bars">
            {visitorTypes.length ? visitorTypes.map(([name, value]) => <div key={name}><span>{name}</span><i><b style={{ width: `${Math.max(8, (value / visitorMax) * 100)}%` }} /></i><em>{value.toLocaleString()}</em></div>) : <small>방문 유형별 데이터가 있으면 이곳에 비교 막대로 표시됩니다.</small>}
          </div>
        </>}
      </article>

      <article className="demand-insight">
        <div className="insight-label"><span>02</span><p>관광 수요 지표</p></div>
        <h3>사람들이 지금<br />무엇을 찾는지 봅니다.</h3>
        <div className="demand-list">
          {enrichmentLoading ? <><div className="insight-skeleton short" /><div className="insight-skeleton short" /></> : enrichment?.demand.length ? enrichment.demand.slice(0, 5).map((item) => <div key={`${item.name}-${item.baseYm}`}><span><b>{item.name}</b><em>{item.value.toFixed(1)}</em></span><i><b style={{ width: `${Math.max(5, (item.value / demandMax) * 100)}%` }} /></i></div>) : <p>지역 관광자원 수요지수의 최신 가용월을 조회합니다.</p>}
        </div>
      </article>

      <aside className="layer-principle">
        <span>W.A.V.E 여행 메모</span>
        <strong>많이 찾는 곳과<br />나에게 맞는 곳은<br />다를 수 있어요.</strong>
        <p>수요·방문량은 순위가 아니라 선택의 맥락으로만 사용합니다. 접근성 적합도와 혼잡 예측을 함께 보세요.</p>
      </aside>
    </div>

    <div className="theme-explorer" data-reveal>
      <div className="layer-tabs" role="tablist" aria-label="여행 테마 데이터 선택">
        {richCatalog.map((item) => <button key={item.id} type="button" role="tab" aria-selected={richMode === item.id} className={richMode === item.id ? "active" : ""} onClick={() => onRichModeChange(item.id)}><span>{item.icon}</span><b>{item.label}</b><small>{item.description}</small></button>)}
      </div>
      <div className="rich-rail" role="tabpanel">
        {enrichmentLoading && [0, 1, 2].map((item) => <div className="rich-card rich-loading" key={item}><i /><span /><b /></div>)}
        {!enrichmentLoading && !richItems.length && <div className="rich-empty"><span>⌁</span><h3>{region}의 {richCatalog.find((item) => item.id === richMode)?.label} 결과를 찾는 중입니다.</h3><p>공공데이터의 지역별 제공 범위에 따라 결과가 없을 수 있습니다.</p><button type="button" onClick={onReloadEnrichment}>다시 조회</button></div>}
        {!enrichmentLoading && richItems.map((spot, index) => <article className="rich-card" key={`${spot.id}-${index}`}>
          <SmartSpotImage src={spot.image} title={spot.title} region={region} tag={spot.tag} rank={index + 1} contentId={spot.id} />
          <section><small>{spot.source}</small><h3>{spot.title}</h3><p>{spot.address || spot.summary || `${region}에서 만나는 ${spot.tag} 여행 정보`}</p><button type="button" disabled={!spot.mapX || !spot.mapY} onClick={() => onRouteFromRichSpot(spot)}>{spot.mapX && spot.mapY ? "지도에서 경로 보기" : "위치 정보 확인 중"}<span>↗</span></button></section>
        </article>)}
      </div>
    </div>
  </section>;
}
