export type PublicPoint = { latitude: number; longitude: number };
export type ParkingAlternative = {
  id: string; name: string; address: string; distanceMeters: number;
  accessibleZone: 'confirmed'; operatingHours?: string; feeInformation?: string;
  institutionName?: string; phoneNumber?: string; referenceDate: string;
  destination: PublicPoint;
};
export function parkingDistanceMeters(from: PublicPoint, to: PublicPoint): number;
export function normalizeParkingRecord(record: Record<string, unknown>, placePoint: PublicPoint): ParkingAlternative | null;
export function rankParkingAlternatives(records: Record<string, unknown>[], placePoint: PublicPoint, limit?: number): ParkingAlternative[];
