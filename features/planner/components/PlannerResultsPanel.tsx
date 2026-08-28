import type { useAudioGuide } from "../hooks/useAudioGuide";
import type { usePlannerParticipation } from "../hooks/usePlannerParticipation";
import type { ApiStatus, PlanData } from "../types";
import PlannerEvidencePanel from "./PlannerEvidencePanel";
import PlannerRouteOverview from "./PlannerRouteOverview";

interface PlannerResultsPanelProps {
  plan: PlanData | null;
  region: string;
  theme: string;
  selectedProfileIds: string[];
  statuses: ApiStatus[];
  liveCount: number;
  audioGuide: ReturnType<typeof useAudioGuide>;
  participation: ReturnType<typeof usePlannerParticipation>;
}

/**
 * 결과 묶음은 W.A.V.E ROUTE만 렌더링한다. 독립적인 06 추천 근거 섹션은 제거됐고,
 * 근거는 추천 카드와 코스 안에 직접 노출한다.
 */
export default function PlannerResultsPanel(props: PlannerResultsPanelProps) {
  return <div className="planner-results-bridge" id="data">
    <PlannerRouteOverview {...props} />
    <PlannerEvidencePanel plan={props.plan} statuses={props.statuses} />
  </div>;
}
