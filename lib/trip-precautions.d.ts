export interface TripPrecautionItem {
  id: string;
  label: string;
  href: `#${string}`;
  actionLabel: string;
}

export const TRIP_PRECAUTION_ITEMS: readonly Readonly<TripPrecautionItem>[];
export function tripPrecautionItems(): readonly Readonly<TripPrecautionItem>[];
