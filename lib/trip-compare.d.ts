export type TripSummary = { id: string; title: string; region: string; dayCount: number; placeCount: number; facilityKeys: string[] };
export type TripCompareRow = { label: string; left: string; right: string; same: boolean };
export function compareTrips(left: TripSummary, right: TripSummary): TripCompareRow[];
