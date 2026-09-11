import type { Place } from '../features/planner/types';
export type AlternativeReason = 'distance' | 'visited' | 'rest' | 'indoor' | 'discover';
export type IndoorEvidence = { state: 'indoor-space' | 'unknown'; detail: string };
export type AlternativeCandidate = {
  place: Place; distanceKm: number; travelMinutes: number | null; travelDelta: number | null;
  visitMinutes: number; visitDelta: number; indoor: IndoorEvidence | null; seen: boolean;
};
export function alternativeCandidates(input: {
  places?: Place[]; original: Place; before?: { mapX: string; mapY: string }; after?: Place;
  savedIds?: string[]; requiredKeys?: string[]; reason?: AlternativeReason; visitedIds?: string[];
  indoorById?: Record<string, IndoorEvidence | undefined>; originalVisitMinutes?: number; limit?: number;
}): AlternativeCandidate[];
