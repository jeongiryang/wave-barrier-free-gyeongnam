import type { ApiStatus, PlanData } from "../types";

export default function PlannerEvidencePanel({ plan, statuses }: { plan: PlanData | null; statuses: ApiStatus[] }) {
  return <section className="data-section" id="data">
    <div className="data-heading" data-reveal><div><p className="section-kicker">06 · 믿을 수 있는 여행 추천</p><h2>왜 이곳을 추천했는지<br />쉽게 보여드려요.</h2></div><p>선택한 지역·관심사·편의 조건과 최신 관광정보를 함께 비교합니다. 제공기관과 확인 시점을 카드에서 바로 확인할 수 있어요.</p></div>
    <details className="evidence-details">
      <summary><span>데이터 근거 자세히 보기</span><small>최신 정보 {statuses.filter((status) => status.state === "live").length}개 · 확인 필요 {statuses.filter((status) => status.state === "error").length}개</small></summary>
      <div className="api-bento">
        {statuses.map((status, index) => <article className={`api-card card-${index + 1}`} key={status.id} data-reveal><div><span className={`api-state ${status.state}`}><i />{status.state === "live" ? "최신 정보" : status.state === "empty" ? "정보 없음" : status.state === "error" ? "확인 필요" : "검색 전"}</span><small>{String(index + 1).padStart(2, "0")}</small></div><h3>{status.name}</h3><p>{status.role}</p><footer><span>{status.note}</span><b>{status.count ? `${status.count}건` : status.state === "empty" ? "결과 없음" : status.state === "error" ? "다시 확인" : "검색 전"}</b></footer></article>)}
        <aside className="trace-card" data-reveal><p>추천이 만들어지는 과정</p><div className="trace-flow"><span>내 여행 조건</span><i>→</i><span>최신 정보 확인</span><i>→</i><span>접근성 비교</span><i>→</i><span>맞춤 코스</span></div><dl><div><dt>여행 지역</dt><dd>경상남도 18개 시·군</dd></div><div><dt>관심사</dt><dd>자연 · 역사 · 레포츠 · 음식</dd></div><div><dt>정보 기준</dt><dd>{plan?.baseYm ? `${plan.baseYm.slice(0, 4)}.${plan.baseYm.slice(4)} 확인` : "검색할 때 최신 정보 확인"}</dd></div><div><dt>개인정보</dt><dd>현재 위치는 기기 안에서만 사용</dd></div></dl></aside>
      </div>
    </details>
  </section>;
}
