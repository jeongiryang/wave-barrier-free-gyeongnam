import type { Place } from "../features/planner/types";

export const SAVED_PLACE_CATALOG_KEY: string;
export const SAVED_PLACE_CATALOG_MAX_ITEMS: number;

export type SavedPlaceSnapshot = Pick<Place, "id" | "name" | "city" | "address" | "image" | "score" | "knownFields" | "source">;

export function sanitizeSavedPlaceSnapshot(value: unknown): SavedPlaceSnapshot | null;
export function sanitizeSavedPlaceCatalog(value: unknown): SavedPlaceSnapshot[];
export function mergeSavedPlaceCatalog(current: unknown, places: unknown): SavedPlaceSnapshot[];
export function removeSavedPlaceSnapshot(current: unknown, id: string): SavedPlaceSnapshot[];
export function resolveSavedPlaces(savedIds: unknown, activePlaces: Place[], catalog: unknown): Place[];
