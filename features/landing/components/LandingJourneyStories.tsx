const PreviewNote = () => <small className="preview-note">기능 화면 미리보기 · 실제 정보는 여행 설계에서 조회합니다.</small>;

export default function LandingJourneyStories() {
  return <>
    <article className="product-story plan-story" data-land-reveal>
      <div className="product-story-copy"><p className="section-kicker">03 · PLAN</p><h2>관광지 목록을<br /><em>하루의 순서로.</em></h2><p>선택한 장소를 날짜에 배치하고 방문 순서를 정리합니다. 이동 경로를 확인한 뒤 일정에 반영하고, 상황이 달라지면 같은 편의조건을 유지하는 대안을 검토합니다.</p><a href="/planner#route">일정 구성해 보기 <span>→</span></a></div>
      <div className="product-preview plan-preview" aria-label="여행 일정 화면 미리보기"><PreviewNote /><header><span><small>MY ITINERARY</small><strong>오늘의 이동 흐름</strong></span><b>장소를 담아 직접 구성</b></header><ol><li><i>1</i><div><small>첫 방문</small><strong>선택한 관광지</strong><p>접근성 상세와 운영 정보를 방문 전에 확인</p></div><span>장소 상세</span></li><li className="transfer"><i aria-hidden="true">↳</i><p>지도에서 자동차·대중교통 이동 비교</p></li><li><i>2</i><div><small>다음 방문</small><strong>동선에 맞춘 다음 장소</strong><p>이동 부담과 일정 적합성을 함께 검토</p></div><span>순서 변경</span></li></ol></div>
    </article>
    <article className="product-story route-story reverse" data-land-reveal>
      <div className="product-story-copy"><p className="section-kicker">04 · ROUTE</p><h2>선택한 장소와 지도를<br /><em>한 흐름으로.</em></h2><p>목록에서 고른 장소가 지도와 경로에 바로 이어집니다. 공급자 일부가 느리거나 실패해도 사용 가능한 자동차·대중교통 정보부터 계속 확인할 수 있습니다.</p><a href="/planner#navigation">지도와 이동 확인하기 <span>→</span></a></div>
      <div className="product-preview route-preview" aria-label="지도와 이동 경로 화면 미리보기"><PreviewNote /><div className="route-map-preview" aria-hidden="true"><span className="map-grid" /><i className="route-line" /><b className="map-pin pin-start">출발</b><b className="map-pin pin-stop">1</b><b className="map-pin pin-end">2</b></div><footer><span className="active"><small>자동차</small><strong>경로 확인 가능</strong></span><span><small>대중교통</small><strong>확인된 구간부터</strong></span><button type="button">목록과 함께 보기</button></footer></div>
    </article>
  </>;
}
