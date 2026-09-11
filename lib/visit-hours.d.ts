export type VisitInfo = {
  id: string;
  status: "available" | "empty" | "location-unconfirmed" | "unsupported";
  checkedAt: string;
  source: string;
  hours?: string;
  restDays?: string;
  eventStart?: string;
  eventEnd?: string;
  checkIn?: string;
  checkOut?: string;
  fees?: string;
  phone?: string;
};
export type PlannedVisit = { day: string; startsAt: number; endsAt: number };
export function visitHoursWindow(value: unknown): { opens: number; closes: number; lastEntry: number | null } | null;
export function assessVisitHours(info: VisitInfo | null, visit?: PlannedVisit): { state: "unknown" | "conflict" | "within"; reason: string; opensAt?: number };
