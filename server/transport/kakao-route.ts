import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import type { Env } from "../shared/env";
import type { ProviderStatusUpdate, RouteApiAlternative, RouteGeometryPoint } from "./types";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function positiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
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
    const response = await fetch(`https://apis-navi.kakaomobility.com/v1/directions?${query.toString()}`, {
      headers: { Authorization: `KakaoAK ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.transport),
    });
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
    if (!positiveNumber(summary.duration) || !positiveNumber(summary.distance)) throw Error("Invalid route measurements");
    const fare = record(summary.fare) ? summary.fare : {};
    if (!Array.isArray(route.sections) || !route.sections.length) throw Error("Missing road geometry");
    const geometry: RouteGeometryPoint[] = [];
    for (const section of route.sections) {
      if (!record(section) || !Array.isArray(section.roads) || !section.roads.length) throw Error("Missing roads");
      for (const road of section.roads) {
        if (!record(road) || !Array.isArray(road.vertexes) || road.vertexes.length < 4 || road.vertexes.length % 2) throw Error("Invalid road vertices");
        for (let i = 0; i < road.vertexes.length; i += 2) {
          const lng: unknown = road.vertexes[i], lat: unknown = road.vertexes[i + 1];
          if (typeof lng !== "number" || typeof lat !== "number" || !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) throw Error("Invalid road coordinate");
          geometry.push({ lng, lat });
        }
      }
    }
    // Keep only provider road vertices; do not append straight links to the requested endpoints.
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
  } catch {
    return { alternative: null, provider: { state: "error", detail: "카카오모빌리티 경로 요청을 완료하지 못했습니다." } };
  }
}
