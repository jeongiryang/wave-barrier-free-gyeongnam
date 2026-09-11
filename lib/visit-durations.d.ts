export const MIN_VISIT_MINUTES: number;
export const MAX_VISIT_MINUTES: number;
export function validVisitMinutes(value: unknown): value is number;
export function sanitizeVisitDurations(value: unknown, placeIds?: string[]): Record<string, number>;
export function changeVisitDuration(current: Record<string, number>, id: string, minutes: number | null): Record<string, number>;
