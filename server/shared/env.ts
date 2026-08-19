export interface Env {
  TOUR_API_SERVICE_KEY_ENCODED?: string;
  EXPRESSWAY_API_KEY?: string;
  ODSAY_API_KEY?: string;
  KAKAO_MAP_JAVASCRIPT_KEY?: string;
  KAKAO_REST_API_KEY?: string;
  KORAIL_API_KEY?: string;
  TAGO_API_KEY?: string;
}

/** Vercel Functions에서는 공개 클라이언트 값이 아닌 서버 환경 변수만 읽는다. */
export function portableEnv(): Env {
  const values: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env;
  return {
    TOUR_API_SERVICE_KEY_ENCODED: values.TOUR_API_SERVICE_KEY_ENCODED,
    EXPRESSWAY_API_KEY: values.EXPRESSWAY_API_KEY,
    ODSAY_API_KEY: values.ODSAY_API_KEY,
    KAKAO_MAP_JAVASCRIPT_KEY: values.KAKAO_MAP_JAVASCRIPT_KEY,
    KAKAO_REST_API_KEY: values.KAKAO_REST_API_KEY,
    KORAIL_API_KEY: values.KORAIL_API_KEY,
    TAGO_API_KEY: values.TAGO_API_KEY,
  };
}
