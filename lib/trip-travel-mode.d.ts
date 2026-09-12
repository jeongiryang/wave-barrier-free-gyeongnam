export type TripTravelMode = "walk" | "bicycle" | "transit" | "car";
export function sanitizeTravelMode(value: unknown): TripTravelMode;
export function travelModeLabel(value: unknown, locale?: string): string;
