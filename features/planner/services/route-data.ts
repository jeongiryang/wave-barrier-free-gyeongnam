import type { RouteAlternative, RoutePoint } from "../../routing/types";
import type {
  DestinationCrowd,
  Place,
  TransportContext,
  TransportProvider,
} from "../types";
import { optionalPlannerJson, plannerJson } from "./api";

export interface RouteDataBundle {
  alternatives?: RouteAlternative[];
  providers?: TransportProvider[];
  context?: TransportContext;
  configured?: boolean;
  message?: string;
}

export async function fetchDestinationCrowd(
  region: string,
  place: Place,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({
    action: "crowd",
    region,
    title: place.name,
  });
  const data = await optionalPlannerJson<{ crowd?: DestinationCrowd | null }>(
    `/api/wave?${params.toString()}`,
    { signal },
  );
  return data?.crowd || null;
}

export function fetchRouteData(
  origin: RoutePoint,
  destination: { lat: number; lng: number },
  signal: AbortSignal,
) {
  const params = new URLSearchParams({
    startLat: String(origin.lat),
    startLng: String(origin.lng),
    endLat: String(destination.lat),
    endLng: String(destination.lng),
  });
  return plannerJson<RouteDataBundle>(`/api/route?${params.toString()}`, {
    cache: "no-store",
    signal,
  });
}
