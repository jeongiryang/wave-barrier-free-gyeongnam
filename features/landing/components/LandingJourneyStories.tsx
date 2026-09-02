export default function LandingJourneyStories() {
  return <>
    <article className="product-story plan-story" data-land-reveal>
      <div className="product-story-copy">
        <p className="section-kicker">03 · 하루 일정</p>
        <h2>관광지 목록을<br /><em>하루의 순서로.</em></h2>
        <p>선택한 장소를 날짜에 배치하고 방문 순서를 정리합니다. 이동 경로를 확인한 뒤 일정에 반영하고, 상황이 달라지면 같은 편의조건을 유지하는 대안을 검토합니다.</p>
        <a href="/planner#itinerary">일정 구성해 보기 <span>→</span></a>
      </div>
      <div className="product-preview plan-preview feature-motion" role="img" aria-label="선택한 두 장소가 하루 일정에 추가되고 방문 순서가 정리되는 흐름">
        <div className="feature-preview-stage" aria-hidden="true">
          <header><span><small>이 기기 일정</small><strong>오늘의 이동 흐름</strong></span><b>추가한 장소로 직접 구성</b></header>
          <ol>
            <li className="motion-stop motion-stop-one"><i>1</i><div><small>첫 방문</small><strong>선택한 관광지</strong><p>편의시설과 운영 정보를 방문 전에 확인</p></div><span>이용 정보</span></li>
            <li className="transfer motion-transfer"><i>↳</i><p>지도에서 자동차·대중교통 이동 비교</p></li>
            <li className="motion-stop motion-stop-two"><i>2</i><div><small>다음 방문</small><strong>동선에 맞춘 다음 장소</strong><p>이동 부담과 일정 적합성을 함께 검토</p></div><span>순서 변경</span></li>
          </ol>
        </div>
      </div>
    </article>
    <article className="product-story route-story reverse" data-land-reveal>
      <div className="product-story-copy">
        <p className="section-kicker">04 · 이동 경로</p>
        <h2>선택한 장소와 지도를<br /><em>한 흐름으로.</em></h2>
        <p>목록에서 고른 장소가 지도와 경로에 바로 이어집니다. 교통정보가 늦게 도착해도 먼저 확인된 이동수단부터 비교할 수 있습니다.</p>
        <a href="/planner#navigation">지도와 이동 확인하기 <span>→</span></a>
      </div>
      <div className="product-preview route-preview feature-motion" role="img" aria-label="출발지에서 두 장소까지 확인된 자동차 경로와 보행 이동을 지도 위에서 비교하는 흐름">
        <div className="feature-preview-stage" aria-hidden="true">
          <div className="route-map-preview">
            <svg className="route-preview-map" viewBox="0 0 720 380" preserveAspectRatio="none">
              <path className="route-road road-one" d="M-20 286 C112 242 126 128 276 150 S475 285 742 170" />
              <path className="route-road road-two" d="M88 -12 C152 82 244 87 318 40 S458 18 518 102 S600 252 744 280" />
              <path className="route-road road-three" d="M-16 92 C126 126 242 310 390 290 S575 92 742 70" />
              <path className="route-path-shadow" d="M72 294 C160 238 214 252 282 198 S420 86 514 126 S602 208 664 82" />
              <path className="route-demo-path" d="M72 294 C160 238 214 252 282 198 S420 86 514 126 S602 208 664 82" />
              <g className="route-traveler route-demo-vehicle" transform="translate(72 294)">
                <rect x="-16" y="-9" width="32" height="16" rx="5" />
                <path d="M-9-9-3-17H9L15-9" />
                <circle cx="-9" cy="9" r="4" /><circle cx="10" cy="9" r="4" />
              </g>
              <g className="route-traveler route-person" transform="translate(282 198)">
                <circle cy="-13" r="5" /><path d="M0-7V8M0-2l-9 8M0-2l8 7M0 8l-7 13M0 8l8 12" />
              </g>
            </svg>
            <b className="map-pin pin-start">출발</b><b className="map-pin pin-stop">1</b><b className="map-pin pin-end">2</b>
          </div>
          <footer><span className="active"><small>자동차</small><strong>경로 확인 가능</strong></span><span><small>대중교통</small><strong>확인된 구간부터</strong></span><span className="route-preview-action">목록과 함께 보기</span></footer>
        </div>
      </div>
    </article>
  </>;
}
