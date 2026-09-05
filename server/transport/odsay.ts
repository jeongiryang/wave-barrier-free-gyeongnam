import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import { SITE_ORIGIN } from "../../lib/site-metadata";
import { odsayProviderStatus, readOdsayResponse } from "../../lib/transport/odsay-response.js";
import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import type { ProviderStatusUpdate, RouteApiAlternative, RouteGeometryPoint } from "./types";

export async function fetchOdsayRoutes(
  env: Env,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  straightDistance: number,
): Promise<{ routes: RouteApiAlternative[]; provider: ProviderStatusUpdate | null }> {
  const apiKey = env.ODSAY_API_KEY?.trim();
  // 키가 없으면 기존 "선택 사항" 표시를 그대로 둔다. 실패가 아니다.
  if (!apiKey) return { routes: [], provider: null };

  try {
    const params = new URLSearchParams({ apiKey, output: "json", lang: "0", SX: String(startLng), SY: String(startLat), EX: String(endLng), EY: String(endLat), OPT: "0" });
    const response = await fetch(`https://api.odsay.com/v1/api/searchPubTransPathT?${params.toString()}`, {
      // Vercel Functions의 송신 IP는 고정값이 아니다. ODsay Web 키는 등록한
      // 서비스 URI와 Referer를 대조하므로 실제 Production origin을 명시한다.
      headers: { Accept: "application/json", Referer: `${SITE_ORIGIN}/` },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS.transport),
    });
    if (!response.ok) {
      return {
        routes: [],
        provider: odsayProviderStatus({ configured: true, failure: `ODsay 응답 ${response.status}` }),
      };
    }

    // ODsay는 인증 실패·조회 범위 초과를 200 + 오류 봉투로 돌려준다.
    const { paths: rawPaths, error } = readOdsayResponse(await response.json());
    if (error) {
      return { routes: [], provider: odsayProviderStatus({ configured: true, error }) };
    }
    const routes: RouteApiAlternative[] = rawPaths.slice(0, 4).map((path, index) => {
      const info = (path.info || {}) as Record<string, unknown>;
      const payment = Number(info.payment);
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
        // 0원은 무료 확인이 아니라 누락값일 수 있으므로 실제 양수 요금만 노출한다.
        payment: Number.isFinite(payment) && payment > 0 ? payment : null,
        paymentType: "fare",
        totalWalk: Number(info.totalWalk || 0),
        transfers: Number(info.busTransitCount || 0) + Number(info.subwayTransitCount || 0),
        totalDistance: Number(info.totalDistance || info.trafficDistance || straightDistance),
        configured: true,
        segments,
        geometry,
      };
    });
    return { routes, provider: odsayProviderStatus({ configured: true, routeCount: routes.length }) };
  } catch {
    return {
      routes: [],
      provider: odsayProviderStatus({ configured: true, failure: "ODsay 경로 요청을 완료하지 못했습니다." }),
    };
  }
}
