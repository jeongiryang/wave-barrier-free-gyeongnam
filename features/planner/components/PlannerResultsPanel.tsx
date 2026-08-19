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

export default function PlannerResultsPanel(props: PlannerResultsPanelProps) {
  return <>
    <PlannerRouteOverview {...props} />
    <PlannerEvidencePanel plan={props.plan} statuses={props.statuses} />
  </>;
}
