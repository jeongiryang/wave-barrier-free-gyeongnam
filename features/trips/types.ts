export type SharedPlace = { id: string; name: string; city: string; summary: string; image: string; score: number | null; features: string[] };
export type SharedTrip = {
  plan: { generatedAt: string; places: SharedPlace[]; stops: Array<{ title: string; note: string; source: string }>; crowd?: { rate: number; place: string } | null };
  selections: { region?: string; theme?: string; themes?: string[]; profiles?: string[]; travelStart?: string; travelEnd?: string; dayStartTime?: string; scheduleAssignments?: Record<string, string>; visitMinutesByPlaceId?: Record<string, number>; fixedVisits?: Record<string, import("../../lib/trip-time-constraints.js").FixedVisit>; dayDeadlines?: Record<string, import("../../lib/trip-time-constraints.js").DayDeadline> };
  origin?: { label?: string };
  restoration?: { requested: number; restored: number; missing: number; mode: "legacy" | "content-id" | "condition-fallback" | "unavailable" };
  expiresAt: number;
};
