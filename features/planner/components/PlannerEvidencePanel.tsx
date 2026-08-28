import type { ApiStatus, PlanData } from "../types";

/**
 * 추천 근거는 이제 추천 카드와 W.A.V.E ROUTE 안에 직접 표시한다.
 * 기존 독립 06 섹션은 제거됐으며, 이 호환 컴포넌트는 렌더링하지 않는다.
 */
export default function PlannerEvidencePanel(props: { plan: PlanData | null; statuses: ApiStatus[] }) {
  void props;
  return null;
}
