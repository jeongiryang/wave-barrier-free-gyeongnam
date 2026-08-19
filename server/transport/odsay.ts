import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import type { RouteApiAlternative, RouteGeometryPoint } from "./types";

export async function fetchOdsayRoutes(env: Env, startLat: number, startLng: number, endLat: number, endLng: number, straightDistance: number): Promise<RouteApiAlternative[]> {
  const apiKey = env.ODSAY_API_KEY?.trim();
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({ apiKey, output: "json", lang: "0", SX: String(startLng), SY: String(startLat), EX: String(endLng), EY: String(endLat), OPT: "0" });
    const response = await fetch(`https://api.odsay.com/v1/api/searchPubTransPathT?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return [];

    const body = await response.json() as Record<string, unknown>;
    const result = body.result as Record<string, unknown> | undefined;
    const rawPaths = Array.isArray(result?.path) ? result.path as Array<Record<string, unknown>> : [];
    return rawPaths.slice(0, 4).map((path, index) => {
      const info = (path.info || {}) as Record<string, unknown>;
      const rawSegments = Array.isArray(path.subPath) ? path.subPath as Array<Record<string, unknown>> : [];
      const geometry: RouteGeometryPoint[] = [{ lat: startLat, lng: startLng }];
      const segments = rawSegments.map((segment) => {
        const traffic = Number(segment.trafficType || 3);
        const lane = Array.isArray(segment.lane) ? segment.lane[0] as Record<string, unknown> | undefined : undefined;
        const sLat = Number(segment.startY);
        const sLng = Number(segment.startX);
        const eLat = Number(segment.endY);
        const eLng = Number(segment.endX);
        if (Number.isFinite(sLat) && Number.isFinite(sLng)) geometry.push({ lat: sLat, lng: sLng });
        if (Number.isFinite(eLat) && Number.isFinite(eLng)) geometry.push({ lat: eLat, lng: eLng });
        return {
          type: traffic === 1 ? "subway" : traffic === 2 ? "bus" : traffic >= 4 ? "intercity" : "walk",
          name: clean(lane?.busNo || lane?.name || segment.startName || (traffic === 3 ? "도보" : "대중교통"), 60),
          minutes: Number(segment.sectionTime || 0),
        };
      });
      geometry.push({ lat: endLat, lng: endLng });
      return {
        id: `odsay-${index + 1}`,
        label: index === 0 ? "대중교통 추천" : `대중교통 ${index + 1}안`,
        provider: "ODsay",
        mode: "transit",
        totalTime: Number(info.totalTime || 0),
        payment: Number.isFinite(Number(info.payment)) ? Number(info.payment) : null,
        totalWalk: Number(info.totalWalk || 0),
        transfers: Number(info.busTransitCount || 0) + Number(info.subwayTransitCount || 0),
        totalDistance: Number(info.totalDistance || info.trafficDistance || straightDistance),
        configured: true,
        segments,
        geometry,
      };
    });
  } catch {
    return [];
  }
}
