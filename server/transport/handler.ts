import type { Env } from "../shared/env";
import { json } from "../shared/http";
import { fetchKakaoRoute } from "./kakao-route";
import { fetchOdsayRoutes } from "./odsay";
import { fetchTransportContext } from "./public-context";
import { finiteCoordinate, haversine } from "./route-utils";
import type { RouteApiAlternative } from "./types";
import { recordOperationalEvent } from "../shared/observability";
import { transportProvider } from "../shared/provider-data";

export { handleHealthApi, handleMapConfig } from "./health";

export async function handleRouteApi(request: Request, env: Env) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  const url = new URL(request.url);
  // An omitted mode keeps the existing comparison API usable for older clients.
  // Current Planner clients always send the explicitly displayed travel mode.
  const mode = url.searchParams.get("mode");
  if (mode !== null && !["car", "transit", "walk", "bicycle"].includes(mode)) {
    return json({ error: "이동수단을 확인해 주세요." }, 400);
  }
  const startLng = finiteCoordinate(url.searchParams.get("startLng"), 120, 135);
  const startLat = finiteCoordinate(url.searchParams.get("startLat"), 30, 40);
  const endLng = finiteCoordinate(url.searchParams.get("endLng"), 120, 135);
  const endLat = finiteCoordinate(url.searchParams.get("endLat"), 30, 40);
  if (startLng === null || startLat === null || endLng === null || endLat === null) {
    return json({ error: "출발·도착 좌표를 확인해 주세요." }, 400);
  }

  const straightDistance = haversine(startLat, startLng, endLat, endLng);
  const wantsTransit = mode === null || mode === "transit";
  const wantsCar = mode === null || mode === "car";
  const emptyContext = { arrivalRetrievedAt: null, nearbyStops: [], arrivals: [], korail: [], catalog: { trainCities: 0, expressTerminals: 0, intercityTerminals: 0 }, datasets: [] };
  const [{ providers, context }, odsayResult, kakaoResult] = await Promise.all([
    wantsTransit ? fetchTransportContext(env, endLat, endLng).then(result => ({ ...result, providers: mode === "transit" ? result.providers.filter(provider => provider.id !== "kakao-drive") : result.providers }))
      : { providers: wantsCar ? [transportProvider("kakao-drive", "KAKAO DRIVE", "자동차 시간·거리·통행료", Boolean(env.KAKAO_REST_API_KEY?.trim()))] : [], context: emptyContext },
    wantsTransit ? fetchOdsayRoutes(env, startLat, startLng, endLat, endLng) : { routes: [], provider: undefined },
    wantsCar ? fetchKakaoRoute(env, startLat, startLng, endLat, endLng) : { alternative: null, provider: undefined },
  ]);

  const alternatives: RouteApiAlternative[] = [...odsayResult.routes];
  if (kakaoResult.alternative) alternatives.push(kakaoResult.alternative);
  // 실제 호출 결과를 제공기관 상태에 옮긴다. 옮기지 않으면 키 미등록과 상류
  // 장애가 화면에서 같은 문구로 보인다.
  for (const [id, update] of [["kakao-drive", kakaoResult.provider], ["odsay", odsayResult.provider]] as const) {
    if (!update) continue;
    const provider = providers.find((item) => item.id === id);
    if (provider) Object.assign(provider, update);
  }

  if (!alternatives.length && (wantsTransit || wantsCar)) {
    const previewMinutes = Math.max(1, Math.round(straightDistance / 450));
    alternatives.push({
      id: "preview",
      label: "직선 연결 미리보기",
      provider: "W.A.V.E",
      mode: "preview",
      totalTime: previewMinutes,
      payment: null,
      totalWalk: 0,
      transfers: 0,
      totalDistance: Math.round(straightDistance),
      configured: false,
      segments: [{ type: "intercity", name: "교통 API 연결 대기", minutes: previewMinutes }],
      geometry: [{ lat: startLat, lng: startLng }, { lat: endLat, lng: endLng }],
    });
  }

  const hasRealRoute = alternatives.some((item) => item.configured);
  const hasTransportKey = providers.some((item) => item.configured);
  const hasTransportData = providers.some((item) => item.state === "connected" || item.state === "ready");
  recordOperationalEvent("route_result", {
    configured: hasRealRoute,
    alternatives: alternatives.length,
    providersConnected: providers.filter((item) => item.state === "connected").length,
    providersDelayed: providers.filter((item) => item.state === "error").length,
  });
  return json({
    configured: hasRealRoute,
    alternatives,
    providers,
    context,
    message: !wantsTransit && !wantsCar
      ? "이 이동수단의 승인된 경로 제공처가 아직 연결되지 않았습니다. 카카오맵에서 확인해 주세요."
      : hasRealRoute
      ? "연결된 교통 API의 경로를 비교합니다."
      : hasTransportData
        ? "KORAIL·TAGO 데이터가 연결되었습니다. 전체 경로는 ODsay 연결 전까지 미리보기로 표시합니다."
        : hasTransportKey
          ? "교통 인증키는 연결되어 있으며 제공기관 요청조건을 확인하고 있습니다."
          : "교통 API 키를 등록하면 실제 시간·요금·환승 정보로 전환됩니다.",
  }, 200, true);
}
