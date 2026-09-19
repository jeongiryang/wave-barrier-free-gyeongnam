export const OBSERVATION_TTL: number;
export const SENSORY_FIELDS: Record<
  string,
  { label: string; values: Record<string, string> }
>;
export type Observation = {
  id?: string;
  placeId: string;
  observedAt: number;
  readings: Record<string, string>;
};
export function observationInput(value: unknown, now?: number): Observation;
export function sensorySummary(
  reports: Observation[],
  now?: number,
): Record<string, { values: string[]; count: number; conflict: boolean }>;
export type CompanionSelections = {
  region: string;
  theme: string;
  profiles: string[];
  locale: string;
  travelStart: string;
  travelEnd: string;
  dayStartTime: string;
  travelMode: import("./trip-travel-mode.js").TripTravelMode;
  selectedPlaceIds: string[];
  scheduleAssignments: Record<string, string>;
  visitMinutesByPlaceId: Record<string, number>;
  breakMinutesByPlaceId: Record<string, number>;
  fixedVisits: Record<string, import("./trip-time-constraints.js").FixedVisit>;
  dayDeadlines: Record<
    string,
    import("./trip-time-constraints.js").DayDeadline
  >;
  restPurposeByPlaceId: Record<string, import("./trip-comfort.js").StopPurpose>;
};
export type CompanionEdit = {
  id: string;
  minutes?: number;
  breakMinutes?: number;
  direction?: "up" | "down";
};
export function companionSnapshot(value: unknown): CompanionSelections;
export function editCompanionStop(
  value: CompanionSelections,
  edit: CompanionEdit,
): CompanionSelections;
export type Expense = {
  toId: string;
  mode: string;
  status: string;
  amount: number;
  participants: string[];
  payer: string;
  shares: { name: string; amount: number; payer: boolean }[];
};
export function splitExpense(
  amount: number,
  participants: string[],
  payer: string,
): Expense["shares"];
export function transportExpense(value: unknown, ids: string[]): Expense;
export type PassportEntry = {
  placeId: string;
  date: string;
  kind: string;
  method?: string;
  recordedAt: number;
};
export function passportEntry(value: unknown, now?: number): PassportEntry;
export const PASSPORT_KINDS: Record<string, string>;
