import type { FixedVisit } from './trip-time-constraints.js';
export function periodForDate(start: string, end: string, date: string): { start: string; end: string } | null;
export function canMoveVisitDate(input: { id: string; date: string; order: string[]; assignments: Record<string, string>; fixed: Record<string, FixedVisit>; start: string; end: string }): boolean;
