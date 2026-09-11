import type { Place } from "../features/planner/types";
export function toggleComparison(ids: string[], id: string, availableIds: string[]): string[];
export function facilityComparison(places: Place[], requestedKeys?: string[]): Array<{ key: string; label: string; values: Array<{ state: "confirmed" | "unknown" | "negative"; detail: string }> }>;
export const inquiryOptions: Array<{ id: string; label: string; question: string; keys: string[] }>;
export function defaultInquiryOptions(place: Place): string[];
export function inquiryText(placeName: string, selected: string[], extra?: string): string;
