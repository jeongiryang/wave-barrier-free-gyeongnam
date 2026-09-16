export type PhotoTripFact = { name: string; region: string; date: string; startTime: string; endTime: string; address: string };
export type PhotoTripPlace = { id: string; name: string; city?: string; startDate?: string; endDate?: string };
export function sanitizePhotoTripFacts(value: unknown): PhotoTripFact[];
export function verifyPhotoTripFacts<T extends PhotoTripPlace>(facts: unknown, places: T[]): Array<{ fact: PhotoTripFact; state: 'verified'|'ambiguous'|'not-found'; place: T | null }>;
