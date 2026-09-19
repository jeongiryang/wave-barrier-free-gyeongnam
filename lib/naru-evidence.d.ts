export type AccessibilityState = "confirmed" | "unknown" | "negative";

export type PlaceLike = {
  accessibility?: Array<{ key: string; label?: string; state?: string; detail?: string }>;
};

export type EvidenceTally = {
  facilityKey: string;
  label: string;
  total: number;
  confirmed: number;
  unknown: number;
  negative: number;
};

export type EvidenceGroups<T> = {
  confirmed: T[];
  unconfirmed: T[];
};

export function placeFacilityState(place: PlaceLike | null | undefined, facilityKey: string): AccessibilityState;
export function hasAccessibilityEvidence(places: readonly PlaceLike[] | null | undefined): boolean;
/** 가장 적게 확인된 편의를 기준으로 고른다. 동점이면 사용자가 먼저 고른 것. */
export function weakestFacility(places: readonly PlaceLike[] | null | undefined, facilityKeys: readonly string[] | null | undefined): string | null;
export function tallyEvidence(places: readonly PlaceLike[] | null | undefined, facilityKey: string): EvidenceTally;
export function groupByEvidence<T extends PlaceLike>(places: readonly T[] | null | undefined, facilityKey: string): EvidenceGroups<T>;
export function missingPhrase(tally: EvidenceTally): string;
export function evidenceSentence(tally: EvidenceTally, region: string): string;
export function evidenceGroupTitle(kind: "confirmed" | "unconfirmed", count: number): string;
export function evidenceStateText(state: AccessibilityState, label: string): string;
