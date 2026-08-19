"use client";

import AccessIcon from "./AccessIcons";

function PreviewNote() {
  return <small className="preview-note">기능 화면 미리보기 · 실제 정보는 여행 설계에서 조회합니다.</small>;
}

export function LandingProductStories() {
  return (
    <section className="product-stories" id="experience" aria-label="W.A.V.E 주요 기능">
      <article className="product-story discover-story" data-land-reveal>
        <div className="product-story-copy"><p className="section-kicker">01 · DISCOVER</p><h2>장소보다 먼저,<br /><em>내 여행 조건부터.</em></h2><p>어디가 인기 있는지보다 내가 편하게 이동할 수 있는지를 먼저 선택합니다. 지역과 관심사, 이동·편의 조건이 바뀌면 추천도 함께 다시 계산됩니다.</p><a href="/planner#planner">내 조건으로 시작하기 <span>→</span></a></div>
        <div className="product-preview condition-preview" aria-label="여행 조건 선택 화면 미리보기"><PreviewNote /><header><span>내 여행 조건</span><b>STEP 01</b></header><fieldset><legend>어떤 도움이 필요하신가요?</legend><div><button type="button" aria-pressed="true"><AccessIcon name="wheel" size={22} />휠체어 이동</button><button type="button" aria-pressed="false"><AccessIcon name="senior" size={22} />걷기 부담</button><button type="button" aria-pressed="true"><AccessIcon name="visual" size={22} />시각 지원</button><button type="button" aria-pressed="false"><AccessIcon name="baby" size={22} />영유아 동반</button></div></fieldset><footer><span><small>선택한 지역</small><strong>경남 18개 시·군 중 선택</strong></span><i aria-hidden="true">→</i><span><small>다음 단계</small><strong>근거가 있는 장소 추천</strong></span></footer>
        </div>
      </article>

      <article className="product-story access-story reverse" data-land-reveal>
        <div className="product-story-copy"><p className="section-kicker">02 · ACCESS</p><h2>추천에는<br /><em>확인 가능한 이유가 있습니다.</em></h2><p>점수 하나로 단정하지 않습니다. 공식 데이터에서 확인된 시설, 정보가 없는 항목, 조회에 실패한 상태를 구분해 방문 전에 무엇을 다시 확인해야 하는지 보여줍니다.</p><a href="/planner#places">추천 근거 확인하기 <span>→</span></a></div>
        <div className="product-preview access-preview" aria-label="접근성 추천 근거 화면 미리보기"><PreviewNote /><header><div><small>추천 근거</small><strong>편의정보 확인 상태</strong></div><span>공식 정보 + W.A.V.E 비교</span></header><ul><li><AccessIcon name="mark" size={21} /><span><b>장애인 주차</b><small>공식 데이터에서 확인</small></span><i className="confirmed">확인됨</i></li><li><AccessIcon name="mark" size={21} /><span><b>접근로</b><small>상세 내용을 함께 표시</small></span><i className="confirmed">확인됨</i></li><li><AccessIcon name="mark" size={21} /><span><b>장애인 화장실</b><small>제공된 정보 없음</small></span><i className="unknown">정보 없음</i></li><li><AccessIcon name="mark" size={21} /><span><b>승강기</b><small>데이터 조회를 완료하지 못함</small></span><i className="failed">조회 실패</i></li></ul><footer>정보 없음은 시설 없음과 다릅니다.</footer></div>
      </article>

      <article className="product-story plan-story" data-land-reveal>
        <div className="product-story-copy"><p className="section-kicker">03 · PLAN</p><h2>관광지 목록을<br /><em>하루의 순서로.</em></h2><p>선택한 장소를 날짜에 배치하고 방문 순서를 정리합니다. 이동 경로를 확인한 뒤 일정에 반영하고, 상황이 달라지면 같은 편의조건을 유지하는 대안을 검토합니다.</p><a href="/planner#route">일정 구성해 보기 <span>→</span></a></div>
        <div className="product-preview plan-preview" aria-label="여행 일정 화면 미리보기"><PreviewNote /><header><span><small>MY ITINERARY</small><strong>오늘의 이동 흐름</strong></span><b>장소를 담아 직접 구성</b></header><ol><li><i>1</i><div><small>첫 방문</small><strong>선택한 관광지</strong><p>접근성 상세와 운영 정보를 방문 전에 확인</p></div><span>장소 상세</span></li><li className="transfer"><i aria-hidden="true">↳</i><p>지도에서 자동차·대중교통 이동 비교</p></li><li><i>2</i><div><small>다음 방문</small><strong>동선에 맞춘 다음 장소</strong><p>이동 부담과 일정 적합성을 함께 검토</p></div><span>순서 변경</span></li></ol></div>
      </article>

      <article className="product-story route-story reverse" data-land-reveal>
        <div className="product-story-copy"><p className="section-kicker">04 · ROUTE</p><h2>선택한 장소와 지도를<br /><em>한 흐름으로.</em></h2><p>목록에서 고른 장소가 지도와 경로에 바로 이어집니다. 공급자 일부가 느리거나 실패해도 사용 가능한 자동차·대중교통 정보부터 계속 확인할 수 있습니다.</p><a href="/planner#navigation">지도와 이동 확인하기 <span>→</span></a></div>
        <div className="product-preview route-preview" aria-label="지도와 이동 경로 화면 미리보기"><PreviewNote /><div className="route-map-preview" aria-hidden="true"><span className="map-grid" /><i className="route-line" /><b className="map-pin pin-start">출발</b><b className="map-pin pin-stop">1</b><b className="map-pin pin-end">2</b></div><footer><span className="active"><small>자동차</small><strong>경로 확인 가능</strong></span><span><small>대중교통</small><strong>확인된 구간부터</strong></span><button type="button">목록과 함께 보기</button></footer></div>
      </article>

      <article className="product-story adapt-story" data-land-reveal>
        <div className="product-story-copy"><p className="section-kicker">05 · ADAPT</p><h2>상황이 달라지면<br /><em>다음 행동까지 제안합니다.</em></h2><p>날씨와 관광 집중 정보를 카드로 끝내지 않습니다. 현재 일정에 어떤 영향이 있는지 설명하고, 같은 접근성 조건을 유지하는 대안과 변경 전후 차이를 보여줍니다.</p><a href="/planner#layers">상황 변화 대응 보기 <span>→</span></a></div>
        <div className="product-preview adapt-preview" aria-label="상황 변화 대응 화면 미리보기"><PreviewNote /><header><span aria-hidden="true">☂</span><div><small>상황 변화 예시</small><strong>야외 일정에 비 예보가 있다면</strong></div><b>행동 제안</b></header><div className="impact-flow"><span><small>1 · 영향</small><strong>야외 체류 부담이 커질 수 있어요.</strong></span><i>→</i><span><small>2 · 대안</small><strong>편의조건을 유지하는 실내 장소 검토</strong></span><i>→</i><span><small>3 · 선택</small><strong>변경 전후를 보고 일정에 반영</strong></span></div><footer>현재 예보처럼 오해하지 않도록 조건형 예시로 표시합니다.</footer></div>
      </article>
    </section>
  );
}
