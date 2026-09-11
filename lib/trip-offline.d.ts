import type { buildItinerarySchedule } from '../features/planner/optimization/itinerary-schedule.js';
import type { VisitInfo } from './visit-hours.js';
import type { TripProgress } from './on-trip.js';
import type { summarizeBudget } from './trip-budget.js';
export type OfflineTripInput = { title:string; schedule:ReturnType<typeof buildItinerarySchedule>; info?:Record<string,VisitInfo>; savedAt?:string; progress?:Record<string,TripProgress>; budget?:ReturnType<typeof summarizeBudget> };
export function escapeOffline(value:unknown):string;
export function offlineTripText(input:OfflineTripInput):string;
export function offlineTripHtml(input:OfflineTripInput):string;
