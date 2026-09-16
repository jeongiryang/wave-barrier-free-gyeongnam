type EvidencePlace = { id: string; name: string; checkedAt?: string; accessibility?: Array<{ key: string; state: 'confirmed'|'negative'|'unknown' }> };
type EvidenceReport = { placeId: string; readings?: Record<string, string> };
export function buildEvidenceReviewQueue(places: EvidencePlace[], reports: EvidenceReport[], now?: number): Array<{ placeId: string; name: string; priority: 'high'|'medium'|'routine'; conflict: boolean; reports: number; officialState: 'confirmed'|'negative'|'unknown'; reason: string; checkedAt: string }>;
