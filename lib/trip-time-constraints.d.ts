export type FixedVisit = { kind: "visit" | "stay" | "event"; time: string; position: number };
export type DayDeadline = { time: string; returnMinutes: number | null; bufferMinutes: number };
export function validTripClock(value: unknown): value is string;
export function sanitizeFixedVisits(value: unknown, allowedIds?: string[]): Record<string, FixedVisit>;
export function sanitizeDayDeadlines(value: unknown, allowedDays?: string[]): Record<string, DayDeadline>;
export function preserveFixedVisitOrder(ids: string[], fixed?: Record<string, FixedVisit>, assignments?: Record<string, string>, defaultDay?: string): string[];
export function assessDayDeadline(entries: Array<{ endsAt: number; travelSource: string }>, deadline?: DayDeadline): null | { projectedEnd: number; remainingMinutes: number; returnKnown: boolean; state: "over" | "within" | "unknown"; allLegsVerified: boolean };
