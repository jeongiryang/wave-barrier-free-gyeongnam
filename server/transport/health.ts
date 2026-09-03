import type { Env } from "../shared/env";
import { json } from "../shared/http";
import { publicTransportKey } from "../shared/provider-data";

export function handleMapConfig(env: Env) {
  return json({ provider: env.KAKAO_MAP_JAVASCRIPT_KEY?.trim() ? "kakao" : "osm", javascriptKey: env.KAKAO_MAP_JAVASCRIPT_KEY?.trim() || "" });
}

export function handleHealthApi(env: Env) {
  const publicData = Boolean(publicTransportKey(env));
  const keys = [
    { id: "tour", name: "관광·공공데이터포털", state: env.TOUR_API_SERVICE_KEY_ENCODED?.trim() ? "configured" : "missing", optional: false, note: "관광 API와 승인된 KORAIL·TAGO API가 함께 사용하는 공공데이터포털 인증키" },
    { id: "kakao-map", name: "Kakao Map", state: env.KAKAO_MAP_JAVASCRIPT_KEY?.trim() ? "configured" : "missing", optional: false, note: "지도 표시용 JavaScript 키" },
    { id: "kakao-route", name: "Kakao Mobility", state: env.KAKAO_REST_API_KEY?.trim() ? "configured" : "missing", optional: false, note: "자동차 경로·시간·거리·통행료 조회" },
    { id: "public-transport", name: "KORAIL·TAGO", state: publicData ? "configured" : "missing", optional: false, note: "별도 키가 아니라 승인된 API에 공공데이터포털 인증키를 사용" },
    { id: "odsay", name: "ODsay", state: env.ODSAY_API_KEY?.trim() ? "configured" : "optional", optional: true, note: "문 앞까지 대중교통 통합 경로가 필요할 때만 추가" },
    { id: "expressway", name: "테마휴게소", state: env.EXPRESSWAY_API_KEY?.trim() ? "configured" : "optional", optional: true, note: "한국도로공사 별도 포털 키가 있을 때 활성화" },
  ] as const;
  const ok = keys.every((key) => key.optional || key.state === "configured");
  return json({
    ok,
    scope: "configuration",
    checkedAt: new Date().toISOString(),
    keys,
  }, ok ? 200 : 503);
}
