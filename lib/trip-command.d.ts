import type { VoiceState } from './voice-edit.js';
import type { Place } from '../features/planner/types';
import type { FixedVisit, DayDeadline } from './trip-time-constraints.js';
import type { StopPurpose, TripComfort } from './trip-comfort.js';
import type { TripTravelMode } from './trip-travel-mode.js';
export type TripCommand = { type: 'add'; id: string; day?: string; afterId?: string } | { type: 'replace'; previousId: string; id: string } | { type: 'remove'; id: string } |
  { type: 'stop'; id: string; day?: string; minutes?: number | null; breakMinutes?: number | null; purpose?: StopPurpose | null; fixed?: FixedVisit | null } |
  { type: 'move'; id: string; direction: 'up' | 'down' } |
  { type: 'schedule'; start?: string; end?: string; startTime?: string; transport?: TripTravelMode } |
  { type: 'comfort'; value: Partial<TripComfort> } | { type: 'deadline'; day: string; value: DayDeadline | null };
export type TripCommandReceipt = { ok: true; command: TripCommand; label: string; before: VoiceState; after: VoiceState; beforeKey: string; afterKey: string };
export function planTripCommand(state: VoiceState, command: TripCommand, places?: Place[]): TripCommandReceipt | { ok: false; reason: string };
