export const TRAVEL_BOOK_STORAGE_KEY: string;
export const TRAVEL_BOOK_MAX_ITEMS: number;
export const TRAVEL_BOOK_MAX_PLACES: number;

export type TravelBookPlace = {
  id: string;
  name: string;
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
};

export type TravelBookInput = Partial<Omit<TravelBook, "places">> & { places: Array<Partial<TravelBookPlace> & { id: string; name: string }> };

export function sanitizeTravelBook(value: unknown, fallbackNow?: string): TravelBook | null;
export function sanitizeTravelBooks(value: unknown): TravelBook[];
export function createTravelBookSnapshot(input: TravelBookInput, now?: string): TravelBook | null;
export function upsertTravelBook(current: unknown, input: unknown, now?: string): TravelBook[];
export function patchTravelBook(current: unknown, id: string, patch: Partial<Pick<TravelBook, "status" | "note" | "title">>, now?: string): TravelBook[];
export function removeTravelBook(current: unknown, id: string): TravelBook[];
export function buildTravelBookPlannerHref(book: unknown): string;
export function travelBookRestorePayload(book: unknown): { savedPlaceIds: string[]; savedPlaces: TravelBookPlace[]; schedule: { travelStart: string; travelEnd: string; dayStartTime: string; scheduleAssignments: Record<string, string> }; href: string } | null;
