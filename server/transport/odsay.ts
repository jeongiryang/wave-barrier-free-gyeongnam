import { UPSTREAM_TIMEOUT_MS } from "../../lib/request-budget.js";
import { isSupportedMapCoordinate } from "../../lib/map-coordinates.js";
import { SITE_ORIGIN } from "../../lib/site-metadata";
import { odsayProviderStatus, readOdsayResponse } from "../../lib/transport/odsay-response.js";
import type { Env } from "../shared/env";
import { clean } from "../shared/http";
import type { ProviderStatusUpdate, RouteApiAlternative, RouteGeometryPoint } from "./types";

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const nonnegative = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const coordinate = (value: unknown, limit: number): value is number => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;

function completeCityPath(path: unknown): path is Record<string, unknown> & { info: Record<string, unknown>; subPath: Array<Record<string, unknown>> } {
  if (!record(path) || ![1, 2, 3].includes(path.pathType as number) || !record(path.info) || !Array.isArray(path.subPath) || path.subPath.length === 0) return false;
  const info = path.info;
  if (!nonnegative(info.totalTime) || info.totalTime === 0 || !nonnegative(info.totalWalk)) return false;
  const distance = info.totalDistance ?? (nonnegative(info.trafficDistance) ? info.trafficDistance + info.totalWalk : null);
  if (!nonnegative(distance) || distance === 0) return false;
  let rides = 0;
  for (const segment of path.subPath) {
    if (!record(segment) || ![1, 2, 3].includes(segment.trafficType as number) || !nonnegative(segment.sectionTime)) return false;
    // Walking transfer segments can have zero minutes and omit stop coordinates.
    if (segment.trafficType !== 3) {
      rides += 1;
      if (!isSupportedMapCoordinate(segment.startY, segment.startX) || !isSupportedMapCoordinate(segment.endY, segment.endX)) return false;
    }
  }
  return rides > 0;
}

export async function fetchOdsayRoutes(
  env: Env,
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
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
    const validPaths = rawPaths.filter(completeCityPath);
    if (rawPaths.length > 0 && validPaths.length === 0) {
      return { routes: [], provider: odsayProviderStatus({ configured: true, error: { code: "INVALID_ROUTE", message: "" } }) };
    }
    const routes: RouteApiAlternative[] = validPaths.slice(0, 4).map((path, index) => {
      const info = path.info;
      const payment = Number(info.payment);
      const rawSegments = path.subPath;
      const geometry: RouteGeometryPoint[] = [{ lat: startLat, lng: startLng }];
      const segments = rawSegments.map((segment) => {
        const traffic = segment.trafficType as number;
        const lane = Array.isArray(segment.lane) ? segment.lane[0] as Record<string, unknown> | undefined : undefined;
        const { startY: sLat, startX: sLng, endY: eLat, endX: eLng } = segment;
        if (coordinate(sLat, 90) && coordinate(sLng, 180) && isSupportedMapCoordinate(sLat, sLng)) geometry.push({ lat: sLat, lng: sLng });
        if (coordinate(eLat, 90) && coordinate(eLng, 180) && isSupportedMapCoordinate(eLat, eLng)) geometry.push({ lat: eLat, lng: eLng });
        return {
          type: traffic === 1 ? "subway" : traffic === 2 ? "bus" : traffic >= 4 ? "intercity" : "walk",
          name: clean(lane?.busNo || lane?.name || segment.startName || (traffic === 3 ? "도보" : "대중교통"), 60),
          minutes: segment.sectionTime as number,
        };
      });
      geometry.push({ lat: endLat, lng: endLng });
      return {
        id: `odsay-${index + 1}`,
        label: index === 0 ? "대중교통 추천" : `대중교통 ${index + 1}안`,
        provider: "ODsay",
        mode: "transit",
        totalTime: info.totalTime as number,
        // 0원은 무료 확인이 아니라 누락값일 수 있으므로 실제 양수 요금만 노출한다.
        payment: Number.isFinite(payment) && payment > 0 ? payment : null,
        paymentType: "fare",
        totalWalk: info.totalWalk as number,
        // Each boarded vehicle is a ride, not a transfer. One bus means zero changes.
        transfers: Math.max(0, rawSegments.filter((segment) => [1, 2].includes(Number(segment.trafficType))).length - 1),
        totalDistance: (info.totalDistance ?? ((info.trafficDistance as number) + (info.totalWalk as number))) as number,
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
