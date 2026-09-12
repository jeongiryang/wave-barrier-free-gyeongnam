import type { Place, PlanData } from "../features/planner/types";
export type ExplorationPlaceAction = { kind: "blocked" | "mismatch" | "acknowledge"; key: string; providerError: boolean };
export function explorationPlaceAction(input: { place: Place | null; plan: PlanData | null; current: boolean; region: string; criteriaKey: string }): ExplorationPlaceAction;
