import type { FacilityLayerMarker } from "../facility-layers";

export function isLowFloorVehicle(value: unknown): boolean;
export function lowFloorArrivalMarkers(
  observations: Array<{ stop: Record<string, unknown>; response: Record<string, unknown> }>,
): FacilityLayerMarker[];
