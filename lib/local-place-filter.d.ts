export type PlaceNameGroup = {
  normalizedName: string;
  count: number;
  ids: string[];
};

export function normalizePlaceName(name: unknown): string;
export function groupPlaceNames(
  places: { id: string; name: string }[],
): PlaceNameGroup[];
export function repeatedNameIds(
  places: { id: string; name: string }[],
  threshold: number,
): string[];
