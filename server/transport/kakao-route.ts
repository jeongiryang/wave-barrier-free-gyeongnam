import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import { isSupportedMapCoordinate, mapDistanceMetres } from "../../lib/map-coordinates.js";
import { requestProvider } from "../shared/provider-request.js";
import { caughtProviderFailure, providerFailureMessage } from "../../lib/provider-failure.js";
import type { Env } from "../shared/env";
import type { ProviderStatusUpdate, RouteApiAlternative, RouteGeometryPoint } from "./types";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export async function fetchKakaoRoute(env: Env, startLat: number, startLng: number, endLat: number, endLng: number): Promise<{ alternative: RouteApiAlternative | null; provider: ProviderStatusUpdate | null }> {
  const apiKey = env.KAKAO_REST_API_KEY?.trim();
  if (!apiKey) return { alternative: null, provider: null };

  try {
    const query = new URLSearchParams({
      origin: `${startLng},${startLat}`,
      destination: `${endLng},${endLat}`,
      priority: "RECOMMEND",
      alternatives: "false",
      road_details: "false",
    });
    const response = await requestProvider({provider:"kakao-mobility",family:"kakao",operation:"directions"}, `https://apis-navi.kakaomobility.com/v1/directions?${query.toString()}`, {
      headers: { Authorization: `KakaoAK ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.transport),
    }, fetch);
    if (!response.ok) {
      return { alternative: null, provider: { state: "error", detail: `카카오모빌리티 응답 ${response.status}` } };
    }

    const body: unknown = await response.json();
    if (!record(body) || !Array.isArray(body.routes) || !record(body.routes[0])) throw Error("Invalid route response");
    const route = body.routes[0];
    // An HTTP success is not a successful route. These are documented no-route conditions.
    if ([1, 101, 102, 103, 104, 105, 106, 107].includes(route.result_code as number)) {
      return { alternative: null, provider: { state: "ready", detail: "현재 출발지와 도착지의 자동차 경로를 찾지 못했습니다. 다른 지점을 선택하거나 외부 지도에서 확인해 주세요." } };
    }
    if (route.result_code !== 0 || !record(route.summary)) throw Error("Invalid route result");
    const summary = route.summary;
    // Kakao documents integer seconds/metres, not minutes/kilometres. A positive
    // value alone cannot establish that these measurements describe this journey.
    if (!positiveInteger(summary.duration) || !positiveInteger(summary.distance)) throw new SyntaxError("Invalid route measurements");
    const fare = record(summary.fare) ? summary.fare : {};
    if (!Array.isArray(route.sections) || !route.sections.length) throw Error("Missing road geometry");
    const geometry: RouteGeometryPoint[] = [];
    for (const section of route.sections) {
      if (!record(section) || !Array.isArray(section.roads) || !section.roads.length) throw Error("Missing roads");
      for (const road of section.roads) {
        if (!record(road) || !Array.isArray(road.vertexes) || road.vertexes.length < 4 || road.vertexes.length % 2) throw Error("Invalid road vertices");
        for (let i = 0; i < road.vertexes.length; i += 2) {
          const lng: unknown = road.vertexes[i], lat: unknown = road.vertexes[i + 1];
          if (typeof lng !== "number" || typeof lat !== "number" || !isSupportedMapCoordinate(lat, lng)) throw Error("Invalid road coordinate");
          geometry.push({ lng, lat });
        }
      }
    }
    // Keep only provider road vertices; do not append straight links to the requested endpoints.
    // Permit road snapping within 1 km, but never approve an unrelated/reversed journey.
    if (mapDistanceMetres(geometry[0], { lat: startLat, lng: startLng }) > 1000
      || mapDistanceMetres(geometry[geometry.length - 1], { lat: endLat, lng: endLng }) > 1000) throw Error("Road endpoints do not match request");
    const geometryMetres = geometry.reduce((metres, point, index) => metres + (index ? mapDistanceMetres(geometry[index - 1], point) : 0), 0);
    // Road vertices provide a lower bound, with 5%/100 m tolerance for geometry
    // precision and road joins. 200 km/h is a deliberately loose corruption guard,
    // not a speed-limit assertion or a replacement travel-time estimate.
    if (summary.distance + Math.max(100, geometryMetres * 0.05) < geometryMetres
      || summary.distance / summary.duration * 3.6 > 200) throw new SyntaxError("Inconsistent route measurements");
    const durationSeconds = summary.duration;
    const rawToll = fare.toll;
    const toll = typeof rawToll === "number" && Number.isFinite(rawToll) && rawToll >= 0 ? rawToll : null;
    return {
      alternative: {
        id: "kakao-car",
        label: "카카오 자동차 추천",
        provider: "Kakao Mobility",
        mode: "car",
        totalTime: Math.max(1, Math.round(durationSeconds / 60)),
        payment: toll,
        paymentType: "toll",
        totalWalk: 0,
        transfers: 0,
        totalDistance: Math.round(summary.distance),
        configured: true,
        segments: [{ type: "car", name: "추천 자동차 경로", minutes: Math.max(1, Math.round(durationSeconds / 60)) }],
        geometry,
      },
      provider: { state: "connected", detail: "카카오모빌리티 자동차 경로 응답을 확인했습니다." },
    };
  } catch (error) {
    const failure = caughtProviderFailure(error,{provider:"kakao-mobility",operation:"directions"});
    return { alternative: null, provider: { state: "error", detail: providerFailureMessage(failure), failure } };
  }
}
