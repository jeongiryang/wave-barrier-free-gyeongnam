import CompactJourneyVisual from "./CompactJourneyVisual";
import { useSitePreferences } from "../../../components/SitePreferences";

export default function LandingAdaptStory() {
  const en = useSitePreferences().locale === "en";
  return <article className="product-story adapt-story" data-land-reveal>
    <CompactJourneyVisual stage="adapt" />
    <div className="product-story-copy">
      {en ? <p className="section-kicker">05 · Before departure</p> : <p className="section-kicker">05 · 상황 대응</p>}
      <h2>{en ? "When plans change," : "상황이 달라지면"}<br /><em>{en ? "see your next step." : "다음 행동까지 제안합니다."}</em></h2>
      <p>{en ? "Review the weather, crowd forecasts and travel information for your itinerary. Compare alternatives and decide what to change yourself." : "현재 일정의 날씨·관광 집중률·교통 정보를 다시 확인하세요. 상황이 달라지면 대안을 비교하고 직접 일정을 바꿀 수 있어요."}</p>
      <a href="/planner#layers">{en ? "Review before leaving" : "상황 변화 대응 보기"} <span aria-hidden="true">→</span></a>
    </div>
    <div className="product-preview adapt-preview feature-motion" role="img" aria-label="비 예보가 야외 일정에 미치는 영향을 확인하고 같은 편의조건의 실내 대안을 일정에 반영하는 흐름">
      <div className="feature-preview-stage" aria-hidden="true">
        <header>
          <svg className="weather-rain-mark" viewBox="0 0 32 32"><path d="M8 20h15a6 6 0 0 0 .5-12A8 8 0 0 0 8.8 10 5 5 0 0 0 8 20Z" /><path d="m11 24-2 4m8-4-2 4m8-4-2 4" /></svg>
          <div><small>상황 변화 예시</small><strong>야외 일정에 비 예보가 있다면</strong></div><b>행동 제안</b>
        </header>
        <div className="impact-flow"><span className="motion-impact impact-one"><small>1 · 영향</small><strong>야외 체류 부담이 커질 수 있어요.</strong></span><i>→</i><span className="motion-impact impact-two"><small>2 · 대안</small><strong>편의조건을 유지하는 실내 장소 검토</strong></span><i>→</i><span className="motion-impact impact-three"><small>3 · 선택</small><strong>변경 전후를 보고 일정에 반영</strong></span></div>
        <footer>현재 예보처럼 오해하지 않도록 조건형 예시로 표시합니다.</footer>
      </div>
    </div>
  </article>;
}
