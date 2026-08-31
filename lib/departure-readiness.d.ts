import type { Place, TransportProvider, WeatherData } from "../features/planner/types";

export type ReadinessState = "confirmed" | "partial" | "recheck";
export type TripDatePhase = {
  id: "no-date" | "past" | "today" | "imminent" | "planned";
  label: string;
  daysUntil: number | null;
};
export type ReadinessItem = {
  id: "weather" | "crowd" | "transport" | "evidence";
  label: string;
  state: ReadinessState;
  summary: string;
  source: string;
  checkedAt: string;
  href: string;
};

export function assessTripDatePhase(travelStart: string, today: string): TripDatePhase;
export function assessDepartureReadiness(options?: {
  travelStart?: string;
  today?: string;
  weather?: WeatherData | null;
  weatherLoading?: boolean;
  crowd?: { rate: number; baseYmd: string; place: string } | null;
  generatedAt?: string;
  transportProviders?: TransportProvider[];
  places?: Place[];
}): { state: ReadinessState; phase: TripDatePhase; items: ReadinessItem[] };
export function escapeIcsText(value: unknown): string;
export function foldIcsLine(line: string): string;
export function buildTripCalendarIcs(options?: {
  travelStart: string;
  travelEnd: string;
  dayStartTime?: string;
  title?: string;
  region?: string;
  placeNames?: string[];
  shareUrl: string;
  createdAt?: Date;
}): string;
