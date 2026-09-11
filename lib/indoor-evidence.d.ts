export type IndoorEvidence = { state: 'indoor-space' | 'unknown'; detail: string };
export function indoorEvidence(overview: unknown): IndoorEvidence;
