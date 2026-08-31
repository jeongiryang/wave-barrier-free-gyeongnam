import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import type { Env } from "../shared/env";
import type { ProviderStatusUpdate, RouteApiAlternative, RouteGeometryPoint } from "./types";

export async function fetchKakaoRoute(env: Env, startLat: number, startLng: number, endLat: number, endLng: number, straightDistance: number): Promise<{ alternative: RouteApiAlternative | null; provider: ProviderStatusUpdate | null }> {
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

    const body = await response.json() as Record<string, unknown>;
    const routes = Array.isArray(body.routes) ? body.routes as Array<Record<string, unknown>> : [];
    const route = routes[0];
    if (!route) return { alternative: null, provider: { state: "ready", detail: "현재 조건의 자동차 경로가 없습니다." } };

    const summary = (route.summary || {}) as Record<string, unknown>;
    const fare = (summary.fare || {}) as Record<string, unknown>;
    const sections = Array.isArray(route.sections) ? route.sections as Array<Record<string, unknown>> : [];
    const geometry: RouteGeometryPoint[] = [{ lat: startLat, lng: startLng }];
    sections.forEach((section) => {
      const roads = Array.isArray(section.roads) ? section.roads as Array<Record<string, unknown>> : [];
      roads.forEach((road) => {
        const vertices = Array.isArray(road.vertexes) ? road.vertexes.map(Number) : [];
        for (let i = 0; i + 1 < vertices.length; i += 2) {
          if (Number.isFinite(vertices[i]) && Number.isFinite(vertices[i + 1])) geometry.push({ lng: vertices[i], lat: vertices[i + 1] });
        }
      });
    });
    geometry.push({ lat: endLat, lng: endLng });
    const durationSeconds = Number(summary.duration || 0);
    const rawToll = fare.toll;
    const toll = rawToll === undefined || rawToll === null || rawToll === "" ? null : Number(rawToll);
    return {
      alternative: {
        id: "kakao-car",
        label: "카카오 자동차 추천",
        provider: "Kakao Mobility",
        mode: "car",
        totalTime: Math.max(1, Math.round(durationSeconds / 60)),
        payment: toll !== null && Number.isFinite(toll) ? Math.max(0, toll) : null,
        paymentType: "toll",
        totalWalk: 0,
        transfers: 0,
        totalDistance: Math.round(Number(summary.distance || straightDistance)),
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
