import type { TransportProviderState } from "../shared/provider-data";

export type RouteGeometryPoint = { lat: number; lng: number };

export type RouteApiAlternative = {
  id: string;
  label: string;
  provider: string;
  mode: "transit" | "car" | "preview";
  totalTime: number;
  payment: number | null;
  paymentType?: "fare" | "toll";
  totalWalk: number;
  transfers: number;
  totalDistance: number;
  configured: boolean;
  segments: Array<{ type: string; name: string; minutes: number }>;
  geometry: RouteGeometryPoint[];
};

export type ProviderStatusUpdate = {
  state: TransportProviderState;
  detail: string;
};
