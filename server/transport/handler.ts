import type { Env } from "../shared/env";
import { clean, json } from "../shared/http";
import {
  attemptProvider as attempt,
  fetchPublicTransportData as fetchPublicTransport,
  koreaYmd,
  publicTransportKey,
  transportProvider,
  type ProviderItem as TransportItem,
} from "../shared/provider-data";

function finiteCoordinate(value: string | null, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function handleRouteApi(request: Request, env: Env) {
  if (request.method !== "GET") return json({ error: "GET 요청만 지원합니다." }, 405);
  const url = new URL(request.url);
  const startLng = finiteCoordinate(url.searchParams.get("startLng"), 120, 135);
  const startLat = finiteCoordinate(url.searchParams.get("startLat"), 30, 40);
  const endLng = finiteCoordinate(url.searchParams.get("endLng"), 120, 135);
  const endLat = finiteCoordinate(url.searchParams.get("endLat"), 30, 40);
  if ([startLng, startLat, endLng, endLat].some((value) => value === null)) return json({ error: "출발·도착 좌표를 확인해 주세요." }, 400);
  const straightDistance = haversine(startLat!, startLng!, endLat!, endLng!);
  const transportKey = publicTransportKey(env);
  const korailKey = Boolean(env.KORAIL_API_KEY?.trim() || env.TOUR_API_SERVICE_KEY_ENCODED?.trim());
  const tagoKey = Boolean(env.TAGO_API_KEY?.trim() || env.TOUR_API_SERVICE_KEY_ENCODED?.trim());
  const runYmd = koreaYmd();
  const [korailPlans, nearbyStops, trainCatalog, expressCatalog, intercityCatalog] = transportKey
    ? await Promise.all([
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/B551457/run/v2", "travelerTrainRunPlan2", {
          returnType: "JSON",
          numOfRows: "10",
          "cond[run_ymd::GTE]": runYmd,
          "cond[run_ymd::LTE]": runYmd,
        })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/BusSttnInfoInqireService", "getCrdntPrxmtSttnList", { gpsLati: String(endLat), gpsLong: String(endLng), numOfRows: "8" })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/TrainInfo", "GetCtyCodeList", { numOfRows: "100" })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/ExpBusInfo", "GetExpBusTrminlList", { numOfRows: "100" })),
        attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/SuburbsBusInfo", "GetSuberbsBusTrminlList", { numOfRows: "100" })),
      ])
    : [null, null, null, null, null];

  let arrivalItems: TransportItem[] = [];
  if (nearbyStops?.ok && nearbyStops.value.items.length) {
    const stop = nearbyStops.value.items[0];
    const cityCode = clean(stop.citycode || stop.cityCode);
    const nodeId = clean(stop.nodeid || stop.nodeId);
    if (cityCode && nodeId) {
      const arrival = await attempt(fetchPublicTransport(env, "https://apis.data.go.kr/1613000/ArvlInfoInqireService", "getSttnAcctoArvlPrearngeInfoList", { cityCode, nodeId, numOfRows: "8" }));
      if (arrival.ok) arrivalItems = arrival.value.items;
    }
  }
  const providers = [
    transportProvider("kakao-drive", "KAKAO DRIVE", "자동차 시간·거리·통행료", Boolean(env.KAKAO_REST_API_KEY?.trim())),
    transportProvider("odsay", "ODsay", "대중교통 시간·요금·환승", Boolean(env.ODSAY_API_KEY?.trim())),
    transportProvider("korail", "KORAIL", "여객열차 운행계획", korailKey, korailPlans),
    transportProvider("tago-bus", "TAGO BUS", `정류장·도착 ${arrivalItems.length ? `${arrivalItems.length}건` : ""}`.trim(), tagoKey, nearbyStops),
    transportProvider("tago-rail", "TAGO RAIL", "열차·지하철", tagoKey, trainCatalog),
    transportProvider("tago-regional", "TAGO EXPRESS", "고속·시외버스", tagoKey, expressCatalog?.ok ? expressCatalog : intercityCatalog),
    transportProvider("tago-mobility", "TAGO MOVE", "항공·선박·카셰어링·PM", tagoKey),
  ];

  const alternatives: Array<Record<string, unknown>> = [];
  if (env.ODSAY_API_KEY?.trim()) {
    try {
      const params = new URLSearchParams({ apiKey: env.ODSAY_API_KEY.trim(), output: "json", lang: "0", SX: String(startLng), SY: String(startLat), EX: String(endLng), EY: String(endLat), OPT: "0" });
      const response = await fetch(`https://api.odsay.com/v1/api/searchPubTransPathT?${params.toString()}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
      if (response.ok) {
        const body = await response.json() as Record<string, unknown>;
        const result = body.result as Record<string, unknown> | undefined;
        const rawPaths = Array.isArray(result?.path) ? result.path as Array<Record<string, unknown>> : [];
        rawPaths.slice(0, 4).forEach((path, index) => {
    const info = (path.info || {}) as Record<string, unknown>;
    const rawSegments = Array.isArray(path.subPath) ? path.subPath as Array<Record<string, unknown>> : [];
    const geometry: Array<{ lat: number; lng: number }> = [{ lat: startLat!, lng: startLng! }];
    const segments = rawSegments.map((segment) => {
      const traffic = Number(segment.trafficType || 3);
      const lane = Array.isArray(segment.lane) ? segment.lane[0] as Record<string, unknown> | undefined : undefined;
      const sLat = Number(segment.startY); const sLng = Number(segment.startX);
      const eLat = Number(segment.endY); const eLng = Number(segment.endX);
      if (Number.isFinite(sLat) && Number.isFinite(sLng)) geometry.push({ lat: sLat, lng: sLng });
      if (Number.isFinite(eLat) && Number.isFinite(eLng)) geometry.push({ lat: eLat, lng: eLng });
      return {
        type: traffic === 1 ? "subway" : traffic === 2 ? "bus" : traffic >= 4 ? "intercity" : "walk",
        name: clean(lane?.busNo || lane?.name || segment.startName || (traffic === 3 ? "도보" : "대중교통"), 60),
        minutes: Number(segment.sectionTime || 0),
      };
    });
    geometry.push({ lat: endLat!, lng: endLng! });
    alternatives.push({
      id: `odsay-${index + 1}`, label: index === 0 ? "대중교통 추천" : `대중교통 ${index + 1}안`, provider: "ODsay", mode: "transit",
      totalTime: Number(info.totalTime || 0), payment: Number.isFinite(Number(info.payment)) ? Number(info.payment) : null,
      totalWalk: Number(info.totalWalk || 0), transfers: Number(info.busTransitCount || 0) + Number(info.subwayTransitCount || 0),
      totalDistance: Number(info.totalDistance || info.trafficDistance || straightDistance), configured: true, segments, geometry,
    });
        });
      }
    } catch { /* another provider or preview remains available */ }
  }

  if (env.KAKAO_REST_API_KEY?.trim()) {
    const kakaoProvider = providers.find((provider) => provider.id === "kakao-drive");
    try {
      const query = new URLSearchParams({
        origin: `${startLng},${startLat}`,
        destination: `${endLng},${endLat}`,
        priority: "RECOMMEND",
        alternatives: "false",
        road_details: "false",
      });
      const response = await fetch(`https://apis-navi.kakaomobility.com/v1/directions?${query.toString()}`, {
        headers: { Authorization: `KakaoAK ${env.KAKAO_REST_API_KEY.trim()}`, Accept: "application/json" },
        signal: AbortSignal.timeout(12000),
      });
      if (response.ok) {
        const body = await response.json() as Record<string, unknown>;
        const routes = Array.isArray(body.routes) ? body.routes as Array<Record<string, unknown>> : [];
        const route = routes[0];
        if (route) {
          const summary = (route.summary || {}) as Record<string, unknown>;
          const fare = (summary.fare || {}) as Record<string, unknown>;
          const sections = Array.isArray(route.sections) ? route.sections as Array<Record<string, unknown>> : [];
          const geometry: Array<{ lat: number; lng: number }> = [{ lat: startLat!, lng: startLng! }];
          sections.forEach((section) => {
            const roads = Array.isArray(section.roads) ? section.roads as Array<Record<string, unknown>> : [];
            roads.forEach((road) => {
              const vertices = Array.isArray(road.vertexes) ? road.vertexes.map(Number) : [];
              for (let i = 0; i + 1 < vertices.length; i += 2) {
                if (Number.isFinite(vertices[i]) && Number.isFinite(vertices[i + 1])) geometry.push({ lng: vertices[i], lat: vertices[i + 1] });
              }
            });
          });
          geometry.push({ lat: endLat!, lng: endLng! });
          const durationSeconds = Number(summary.duration || 0);
          const toll = Number(fare.toll || 0);
          alternatives.push({
            id: "kakao-car", label: "카카오 자동차 추천", provider: "Kakao Mobility", mode: "car",
            totalTime: Math.max(1, Math.round(durationSeconds / 60)), payment: Number.isFinite(toll) ? toll : null,
            totalWalk: 0, transfers: 0, totalDistance: Math.round(Number(summary.distance || straightDistance)), configured: true,
            segments: [{ type: "car", name: "추천 자동차 경로", minutes: Math.max(1, Math.round(durationSeconds / 60)) }], geometry,
          });
          if (kakaoProvider) {
            kakaoProvider.state = "connected";
            kakaoProvider.detail = "카카오모빌리티 자동차 경로 응답을 확인했습니다.";
          }
        }
      } else if (kakaoProvider) {
        kakaoProvider.state = "error";
        kakaoProvider.detail = `카카오모빌리티 응답 ${response.status}`;
      }
    } catch {
      if (kakaoProvider) {
        kakaoProvider.state = "error";
        kakaoProvider.detail = "카카오모빌리티 경로 요청을 완료하지 못했습니다.";
      }
    }
  }

  if (!alternatives.length) alternatives.push({
    id: "preview", label: "직선 연결 미리보기", provider: "W.A.V.E", mode: "preview", totalTime: Math.max(1, Math.round(straightDistance / 450)),
    payment: null, totalWalk: 0, transfers: 0, totalDistance: Math.round(straightDistance), configured: false,
    segments: [{ type: "intercity", name: "교통 API 연결 대기", minutes: Math.max(1, Math.round(straightDistance / 450)) }],
    geometry: [{ lat: startLat, lng: startLng }, { lat: endLat, lng: endLng }],
  });
  const context = {
    nearbyStops: nearbyStops?.ok ? nearbyStops.value.items.slice(0, 6).map((item) => ({
      id: clean(item.nodeid || item.nodeId),
      name: clean(item.nodenm || item.nodeNm || item.sttnNm || "인근 정류장"),
      cityCode: clean(item.citycode || item.cityCode),
    })) : [],
    arrivals: arrivalItems.slice(0, 6).map((item) => ({
      route: clean(item.routeno || item.routeNo || item.routenm || item.routeNm || "버스"),
      minutes: Number(item.arrtime || item.arrTime) > 0 ? Math.max(1, Math.round(Number(item.arrtime || item.arrTime) / 60)) : null,
      stops: Number(item.arrprevstationcnt || item.arrPrevStationCnt || 0),
    })),
    korail: korailPlans?.ok ? korailPlans.value.items.slice(0, 6).map((item) => ({
      trainNo: clean(item.trn_no || item.trnNo || item.trainNo || item.trainno || "열차"),
      departure: clean(item.dptre_stn_nm || item.dptreStnNm || item.depPlaceNm || item.depplacename || item.stdepplacename),
      arrival: clean(item.arvl_stn_nm || item.arvlStnNm || item.arrPlaceNm || item.arrplacename || item.starrplacename),
      departureTime: clean(item.trn_plan_dptre_dt || item.trnPlanDptreDt || item.depplandtime || item.depPlandTime),
    })) : [],
    catalog: {
      trainCities: trainCatalog?.ok ? trainCatalog.value.total : 0,
      expressTerminals: expressCatalog?.ok ? expressCatalog.value.total : 0,
      intercityTerminals: intercityCatalog?.ok ? intercityCatalog.value.total : 0,
    },
    datasets: [
      { id: "bus-stop", name: "버스정류소", state: nearbyStops?.ok ? (nearbyStops.value.items.length ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "bus-route", name: "버스노선", state: tagoKey ? "ready" : "missing" },
      { id: "bus-location", name: "버스위치", state: tagoKey ? "ready" : "missing" },
      { id: "bus-arrival", name: "버스도착", state: arrivalItems.length ? "live" : tagoKey ? "ready" : "missing" },
      { id: "subway", name: "지하철", state: tagoKey ? "ready" : "missing" },
      { id: "express-arrival", name: "고속버스도착", state: tagoKey ? "ready" : "missing" },
      { id: "train", name: "열차", state: trainCatalog?.ok ? (trainCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "express", name: "고속버스", state: expressCatalog?.ok ? (expressCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "intercity", name: "시외버스", state: intercityCatalog?.ok ? (intercityCatalog.value.total ? "live" : "ready") : tagoKey ? "error" : "missing" },
      { id: "air", name: "국내항공", state: tagoKey ? "ready" : "missing" },
      { id: "ship", name: "국내선박", state: tagoKey ? "ready" : "missing" },
      { id: "carshare", name: "카셰어링", state: tagoKey ? "ready" : "missing" },
      { id: "pm", name: "공유PM", state: tagoKey ? "ready" : "missing" },
      { id: "korail-plan", name: "KORAIL 운행계획", state: korailPlans?.ok ? (korailPlans.value.total ? "live" : "ready") : korailKey ? "error" : "missing" },
    ],
  };
  const hasRealRoute = alternatives.some((item) => item.configured);
  const hasTransportKey = providers.some((item) => item.configured);
  const hasTransportData = providers.some((item) => item.state === "connected" || item.state === "ready");
  return json({
    configured: hasRealRoute,
    alternatives,
    providers,
    context,
    message: hasRealRoute
      ? "연결된 교통 API의 경로를 비교합니다."
      : hasTransportData
        ? "KORAIL·TAGO 데이터가 연결되었습니다. 전체 경로는 ODsay 연결 전까지 미리보기로 표시합니다."
        : hasTransportKey
          ? "교통 인증키는 연결되어 있으며 제공기관 요청조건을 확인하고 있습니다."
          : "교통 API 키를 등록하면 실제 시간·요금·환승 정보로 전환됩니다.",
  }, 200, true);
}

export function handleMapConfig(env: Env) {
  return json({ provider: env.KAKAO_MAP_JAVASCRIPT_KEY?.trim() ? "kakao" : "osm", javascriptKey: env.KAKAO_MAP_JAVASCRIPT_KEY?.trim() || "" });
}

export function handleHealthApi(env: Env) {
  const publicData = Boolean(publicTransportKey(env));
  return json({
    checkedAt: new Date().toISOString(),
    keys: [
      { id: "tour", name: "관광·공공데이터포털", state: env.TOUR_API_SERVICE_KEY_ENCODED?.trim() ? "configured" : "missing", optional: false, note: "관광 API와 승인된 KORAIL·TAGO API가 함께 사용하는 공공데이터포털 인증키" },
      { id: "kakao-map", name: "Kakao Map", state: env.KAKAO_MAP_JAVASCRIPT_KEY?.trim() ? "configured" : "missing", optional: false, note: "지도 표시용 JavaScript 키" },
      { id: "kakao-route", name: "Kakao Mobility", state: env.KAKAO_REST_API_KEY?.trim() ? "configured" : "missing", optional: false, note: "자동차 경로·시간·거리·통행료 조회" },
      { id: "public-transport", name: "KORAIL·TAGO", state: publicData ? "configured" : "missing", optional: false, note: "별도 키가 아니라 승인된 API에 공공데이터포털 인증키를 사용" },
      { id: "odsay", name: "ODsay", state: env.ODSAY_API_KEY?.trim() ? "configured" : "optional", optional: true, note: "문 앞까지 대중교통 통합 경로가 필요할 때만 추가" },
      { id: "expressway", name: "테마휴게소", state: env.EXPRESSWAY_API_KEY?.trim() ? "configured" : "optional", optional: true, note: "한국도로공사 별도 포털 키가 있을 때 활성화" },
    ],
  });
}

