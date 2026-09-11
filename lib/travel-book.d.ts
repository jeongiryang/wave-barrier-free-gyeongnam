export const TRAVEL_BOOK_STORAGE_KEY: string;
export const TRAVEL_BOOK_MAX_ITEMS: number;
export const TRAVEL_BOOK_MAX_PLACES: number;

export type TravelBookPlace = {
  id: string;
  name: string;
  contentTypeId?: string;
  city: string;
  address: string;
  image: string;
  score: number | null;
  knownFields: number;
  source: string;
};

export type TravelBook = {
  id: string;
  fingerprint: string;
  title: string;
  region: string;
  theme: string;
  themes?: string[];
  profiles: string[];
  travelStart: string;
  travelEnd: string;
  dayStartTime: string;
  createdAt: string;
  updatedAt: string;
  status: "planned" | "visited";
  note: string;
  places: TravelBookPlace[];
  scheduleAssignments: Record<string, string>;
  comfort?: import("./trip-comfort.js").TripComfort;
  breakMinutesByPlaceId?: Record<string, number>; restPurposeByPlaceId?: Record<string, import("./trip-comfort.js").StopPurpose>;
  visitMinutesByPlaceId?: Record<string, number>; fixedVisits?: Record<string, import("./trip-time-constraints.js").FixedVisit>; dayDeadlines?: Record<string, import("./trip-time-constraints.js").DayDeadline>;
};

export type TravelBookInput = Partial<Omit<TravelBook, "places">> & { places: Array<Partial<TravelBookPlace> & { id: string; name: string }> };
export function travelBookRegions(places: Array<{ city?: string }>): string[];

export function sanitizeTravelBook(value: unknown, fallbackNow?: string): TravelBook | null;
export function sanitizeTravelBooks(value: unknown): TravelBook[];
export function createTravelBookSnapshot(input: TravelBookInput, now?: string): TravelBook | null;
export function upsertTravelBook(current: unknown, input: unknown, now?: string): TravelBook[];
export function patchTravelBook(current: unknown, id: string, patch: Partial<Pick<TravelBook, "status" | "note" | "title">>, now?: string): TravelBook[];
export function removeTravelBook(current: unknown, id: string): TravelBook[];
export function buildTravelBookPlannerHref(book: unknown): string;
export function travelBookRestorePayload(book: unknown): { savedPlaceIds: string[]; savedPlaces: TravelBookPlace[]; themes: string[]; schedule: { travelStart: string; travelEnd: string; dayStartTime: string; scheduleAssignments: Record<string, string>; visitMinutesByPlaceId?: Record<string, number>; fixedVisits?: Record<string, import("./trip-time-constraints.js").FixedVisit>; dayDeadlines?: Record<string, import("./trip-time-constraints.js").DayDeadline>; comfort?: import("./trip-comfort.js").TripComfort; breakMinutesByPlaceId?: Record<string, number>; restPurposeByPlaceId?: Record<string, import("./trip-comfort.js").StopPurpose> }; href: string } | null;
