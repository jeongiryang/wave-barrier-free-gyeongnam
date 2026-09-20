export type TrashBinItem = {
  id: string;
  kind?: string;
  locationNote?: string;
  distanceMeters: number;
  destination: { latitude: number; longitude: number };
  referenceDate: string;
};

export function trashBinDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number;
export function normalizeTrashBinRecord(record: unknown, placePoint: { latitude: number; longitude: number }): TrashBinItem | null;
export function rankTrashBins(records: unknown[], placePoint: { latitude: number; longitude: number }, limit?: number): TrashBinItem[];
