export type PublicStop = { nodeId: string; cityCode: string; name: string; point: { lat: number; lng: number } | null; distance: number | null };
export type RouteStop = { nodeId: string; name: string; order: number; direction: string; point: { lat: number; lng: number } | null };
export type ReturnDirection = { status: 'available' | 'terminal' | 'unconfirmed'; stops: RouteStop[]; next: RouteStop | null; reason: string };
export type ReturnBusRoute = { routeId: string; routeName: string; vehicles: Array<{ seconds: number | null; stopsAway: number | null; vehicle: string }> };
export type ReturnTransportInfo = {
  id: string; status: string; source: string; checkedAt: string | null; arrivalCheckedAt: string | null;
  placeName?: string; stops: PublicStop[]; routes: ReturnBusRoute[]; selected?: PublicStop; message?: string;
  moreStops?: boolean; moreArrivals?: boolean; routeId?: string; direction?: ReturnDirection; routeCheckedAt?: string | null;
  times?: { origin: string; destination: string; first: string; last: string }; timesCheckedAt?: string | null;
};
export function transportId(value: unknown): string;
export function nearbyReturnStops(items: unknown, origin: { lat: number; lng: number } | null): PublicStop[];
export function groupReturnArrivals(items: unknown, nodeId: string): ReturnBusRoute[];
export function returnRouteDirection(items: unknown, routeId: string, nodeId: string, complete?: boolean): ReturnDirection;
export function nearbyDownstreamStops(direction: ReturnDirection | undefined, target: { mapX?: string; mapY?: string } | undefined): Array<RouteStop & { distance: number }>;
export function originBusTimes(item: unknown): { origin: string; destination: string; first: string; last: string };
export function returnArrivalLabel(seconds: number | null, checkedAt: string | null, now?: number): string;
