import type { Place, PlanData, WeatherData } from '../features/planner/types';
import type { AssistantAction } from './assistant-actions.js';
export type NaruStop = { place: Place; date: string; minutes: number; breakMinutes: number; reasons: string[]; unknown: string[]; replaces?: string };
export type NaruJourney = { removed?: Array<{ place: Place; date: string }>; restOnly?: boolean; restDay?: string; start: string; end: string; region: string; profiles: string[]; themes: string[]; transport: 'walk'|'bicycle'|'transit'|'car'; relaxed: boolean; originRegion?: string; stops: NaruStop[]; plan: PlanData; weather: WeatherData | null; warnings: string[]; generatedAt: string; action: AssistantAction['action'] };
export type ExistingStop = { id: string; date: string; fixed: boolean; place?: Place };
export function fatigueRemovals(existing: ExistingStop[], days: string[], targetDay?: string): Array<{ place: Place; date: string }>;
export function journeyDays(start: string, end: string): string[];
export function selectJourneyStops(input: { places: Place[]; days: string[]; profiles?: string[]; visitById?: Record<string, import('./visit-hours.js').VisitInfo>; indoor?: boolean; indoorById?: Record<string, { state: string; detail?: string }>; relaxed?: boolean; transport?: string; existing?: ExistingStop[]; targetDay?: string; replace?: boolean; anchorId?: string }): NaruStop[];
export function validateJourneyApplication(draft: NaruJourney, state: { saved: string[]; fixed: Record<string, unknown>; assignments: Record<string, string>; start: string }): string;
