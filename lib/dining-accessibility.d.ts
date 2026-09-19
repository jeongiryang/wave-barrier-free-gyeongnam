export type DiningFacilityState = "confirmed" | "unknown" | "negative";
export type DiningFacilityLike = { key: string; label: string; state: DiningFacilityState };
export type DiningGroupCopy = { id: string; title: string; evidence: string };

export declare const DINING_TAG_LIMIT: number;
export declare const DINING_EVIDENCE_NOTE: string;
export declare const DINING_DUPLICATE_METRES: number;
export declare const DINING_GROUPS: { official: DiningGroupCopy; placeSearch: DiningGroupCopy };

export declare function diningFacilityTagText(facility: { label?: string; state?: string }): string;
export declare function diningFacilityTags<T extends DiningFacilityLike>(facilities: T[], requestedKeys?: string[]): { shown: T[]; hidden: number };
export declare function roundDiningDistance(meters: unknown): number | null;
export declare function diningDistanceText(meters: unknown): string;
export declare function normalizeDiningName(name: unknown): string;
export declare function dedupeNearbyDining<T extends { name?: string; distanceMeters?: number }>(official: Array<{ name?: string; distanceMeters?: number }>, nearby: T[]): T[];
export declare function splitDiningGroups<T extends { evidence?: string }>(items: T[]): { official: T[]; placeSearch: T[] };
