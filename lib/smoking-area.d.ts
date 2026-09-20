export type SmokingAreaItem = {
  id: string;
  name: string;
  address: string;
  distanceMeters: number;
  destination: { latitude: number; longitude: number };
  institutionName?: string;
  note?: string;
  referenceDate: string;
};

export function smokingAreaDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number | null;
export function normalizeNoSmokingAreas(
  records: unknown[],
  origin: { latitude: number; longitude: number },
): SmokingAreaItem[];
