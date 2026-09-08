import type { Place } from "../features/planner/types";
import type { RoutePoint, RouteAlternative } from "../features/routing/types";
import type { RouteDataBundle } from "../features/planner/services/route-data";
export type ItineraryLeg = { key: string; day: string; place: Place; from: RoutePoint | null; to: RoutePoint | null; fromLabel: string; blocked: boolean };
export function buildItineraryLegs(options: { places: Place[]; days: string[]; assignments: Record<string, string>; origin: RoutePoint; originLabel: string; privateOrigin: boolean }): ItineraryLeg[];
export function usableLegRoutes(bundle: RouteDataBundle | undefined, mode: string): RouteAlternative[];
