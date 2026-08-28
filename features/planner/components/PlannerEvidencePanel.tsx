import type { ApiStatus, PlanData } from "../types";

export default function PlannerEvidencePanel({ plan, statuses }: { plan: PlanData | null; statuses: ApiStatus[] }) {
  return <details className="journey-evidence-details">
    <summary><span>데이터 출처와 확인 상태</span><small>최신 정보 {statuses.filter((status) => status.state === "live").length}개 · 확인 필요 {statuses.filter((status) => status.state === "error").length}개</small></summary>
    <div className="journey-evidence-grid">
      {statuses.map((status) => <article key={status.id}><span className={`api-state ${status.state}`}><i />{status.state === "live" ? "최신 정보" : status.state === "empty" ? "정보 없음" : status.state === "error" ? "확인 필요" : "검색 전"}</span><strong>{status.name}</strong><p>{status.role}</p><small>{status.note}{status.count ? ` · ${status.count}건` : ""}</small></article>)}
      <aside><strong>추천 데이터 기준</strong><p>{plan?.baseYm ? `${plan.baseYm.slice(0, 4)}.${plan.baseYm.slice(4)} 기준 정보를 확인했습니다.` : "검색할 때 연결된 최신 정보를 확인합니다."}</p><small>현재 위치는 기기 안에서 경로 계산에만 사용합니다.</small></aside>
    </div>
  </details>;
}
