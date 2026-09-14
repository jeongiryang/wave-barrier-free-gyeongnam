import type { Place } from '../features/planner/types';

export type DecisionEvidenceState = 'confirmed' | 'negative' | 'unknown';
export type DecisionRoute = { day: string; from: string; to: string; state: 'confirmed' | 'private' | 'unknown'; provider?: string; minutes?: number | null };
export type TripDecisionReceipt = {
  criteria: { region: string; theme: string; travelStart: string; travelEnd: string; travelMode: string; facilities: Array<{ key: string; label: string }> };
  totals: { places: number; requirements: number; confirmed: number; negative: number; unknown: number; routes: number; confirmedRoutes: number };
  places: Array<{ id: string; name: string; source: string; checkedAt: string; evidence: Array<{ key: string; label: string; state: DecisionEvidenceState; detail: string }> }>;
  routes: Array<{ day: string; from: string; to: string; state: 'confirmed' | 'private' | 'unknown'; provider: string; minutes: number | null }>;
};
export function buildTripDecisionReceipt(input: { region?: string; theme?: string; travelStart?: string; travelEnd?: string; travelMode?: string; requiredKeys?: string[]; places?: Place[]; routes?: DecisionRoute[] }): TripDecisionReceipt;
export function tripDecisionReceiptText(receipt: TripDecisionReceipt, createdAt?: string): string;
