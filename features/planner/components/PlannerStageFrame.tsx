import type { ReactNode } from "react";
import type { ReturnTypeOfUseJourneyProgress } from "../journey-progress-types";
import type { JourneyStepId } from "../hooks/useJourneyProgress";
import type { PlannerStageView } from "../hooks/usePlannerStageView";
export default function PlannerStageFrame({ view, step, activeStepId, children }: {
  view: PlannerStageView; step: ReturnTypeOfUseJourneyProgress["steps"][number]; steps: ReturnTypeOfUseJourneyProgress["steps"]; activeStepId: JourneyStepId;
  interactive: boolean; onStepChange: (step: JourneyStepId) => void; onShowOverview: () => void; children: ReactNode;
}) {
  const active = step.id === activeStepId;
  return <div className="journey-stage-panel" data-step={step.id} data-active={active || undefined} hidden={view === "guided" && !active} id={step.id === "departure-readiness" ? step.id : undefined}>{children}</div>;
}
