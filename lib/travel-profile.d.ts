export type TravelProfileInput = { trips: Array<{ id: string; region: string; dayCount: number; facilityKeys: string[]; placeTypeIds: string[] }> };
export type TravelProfileEntry = { label: string; count: number };
export type TravelProfile = { tripCount: number; regions: TravelProfileEntry[]; facilities: TravelProfileEntry[]; placeTypes: TravelProfileEntry[]; lengths: TravelProfileEntry[]; suggestion: { region: string | null; facilityKeys: string[] } };
export function buildTravelProfile(input: TravelProfileInput): TravelProfile | null;
