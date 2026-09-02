export default function LandingAdaptStory() {
  return <article className="product-story adapt-story" data-land-reveal>
    <div className="product-story-copy">
      <p className="section-kicker">05 · 상황 대응</p>
      <h2>상황이 달라지면<br /><em>다음 행동까지 제안합니다.</em></h2>
      <p>날씨와 관광 집중 정보를 카드로 끝내지 않습니다. 현재 일정에 어떤 영향이 있는지 설명하고, 같은 접근성 조건을 유지하는 대안과 변경 전후 차이를 보여줍니다.</p>
      <a href="/planner#layers">상황 변화 대응 보기 <span>→</span></a>
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
