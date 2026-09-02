import AccessIcon from "../../../components/AccessIcons";

export default function LandingDiscoveryStories() {
  return <>
    <article className="product-story discover-story" data-land-reveal>
      <div className="product-story-copy">
        <p className="section-kicker">01 · 여행 조건</p>
        <h2>장소보다 먼저,<br /><em>내 여행 조건부터.</em></h2>
        <p>어디가 인기 있는지보다 내가 편하게 이동할 수 있는지를 먼저 선택합니다. 지역과 관심사, 이동·편의 조건이 바뀌면 추천도 함께 다시 계산됩니다.</p>
        <a href="/planner#planner">내 조건으로 시작하기 <span>→</span></a>
      </div>
      <div className="product-preview condition-preview feature-motion" role="img" aria-label="필요한 이동과 편의 조건을 고르면 근거가 확인된 장소 추천으로 이어지는 흐름">
        <div className="feature-preview-stage" aria-hidden="true">
          <header><span>내 여행 조건</span><b>첫 번째 단계</b></header>
          <div className="condition-preview-fieldset">
            <strong>어떤 도움이 필요하신가요?</strong>
            <div className="condition-preview-options">
              <span className="condition-option motion-choice choice-one is-selected"><AccessIcon name="wheel" size={22} />휠체어 이동</span>
              <span className="condition-option motion-choice choice-two"><AccessIcon name="senior" size={22} />걷기 부담</span>
              <span className="condition-option motion-choice choice-three is-selected"><AccessIcon name="visual" size={22} />시각 지원</span>
              <span className="condition-option motion-choice choice-four"><AccessIcon name="baby" size={22} />영유아 동반</span>
            </div>
          </div>
          <footer><span><small>선택한 지역</small><strong>경남 18개 시·군 중 선택</strong></span><i>→</i><span><small>다음 단계</small><strong>근거가 있는 장소 추천</strong></span></footer>
        </div>
      </div>
    </article>
    <article className="product-story access-story reverse" data-land-reveal>
      <div className="product-story-copy">
        <p className="section-kicker">02 · 추천 근거</p>
        <h2>추천에는<br /><em>확인 가능한 이유가 있습니다.</em></h2>
        <p>점수 하나로 단정하지 않습니다. 공식 데이터에서 확인된 시설, 정보가 없는 항목, 조회에 실패한 상태를 구분해 방문 전에 무엇을 다시 확인해야 하는지 보여줍니다.</p>
        <a href="/planner#places">추천 근거 확인하기 <span>→</span></a>
      </div>
      <div className="product-preview access-preview feature-motion" role="img" aria-label="편의정보를 확인됨, 정보 없음, 조회 실패로 나누어 보여주는 추천 근거 예시">
        <div className="feature-preview-stage" aria-hidden="true">
          <header><div><small>추천 근거</small><strong>편의정보 확인 상태</strong></div><span>공식 데이터에서 확인한 항목</span></header>
          <ul>
            <li className="motion-evidence evidence-one"><AccessIcon name="mark" size={21} /><span><b>장애인 주차</b><small>공식 데이터에서 확인</small></span><i className="confirmed">확인됨</i></li>
            <li className="motion-evidence evidence-two"><AccessIcon name="mark" size={21} /><span><b>접근로</b><small>상세 내용을 함께 표시</small></span><i className="confirmed">확인됨</i></li>
            <li className="motion-evidence evidence-three"><AccessIcon name="mark" size={21} /><span><b>장애인 화장실</b><small>제공된 정보 없음</small></span><i className="unknown">정보 없음</i></li>
            <li className="motion-evidence evidence-four"><AccessIcon name="mark" size={21} /><span><b>승강기</b><small>데이터 조회를 완료하지 못함</small></span><i className="failed">조회 실패</i></li>
          </ul>
          <footer>정보 없음은 시설 없음과 다릅니다.</footer>
        </div>
      </div>
    </article>
  </>;
}
