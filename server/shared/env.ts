export interface Env {
  /** Non-secret exact source revision set only by the Actions deployment. */
  WAVE_DEPLOYMENT_SHA?: string;
  TOUR_API_SERVICE_KEY_ENCODED?: string;
  EXPRESSWAY_API_KEY?: string;
  ODSAY_API_KEY?: string;
  KAKAO_MAP_JAVASCRIPT_KEY?: string;
  KAKAO_REST_API_KEY?: string;
  KORAIL_API_KEY?: string;
  TAGO_API_KEY?: string;
  SANITARY_SUPPLY_API_URL?: string;
  /** 공공데이터포털에서 승인받은 경남 쓰레기통 JSON API의 HTTPS 주소. */
  WASTE_BIN_API_URL?: string;
  /** 화면에 표시할 정확한 지자체·데이터셋 이름. */
  WASTE_BIN_API_SOURCE?: string;
}

/** Vercel Functions에서는 공개 클라이언트 값이 아닌 서버 환경 변수만 읽는다. */
export function portableEnv(): Env {
  const values: Record<string, string | undefined> = typeof process === "undefined" ? {} : process.env;
  return {
    WAVE_DEPLOYMENT_SHA: values.WAVE_DEPLOYMENT_SHA,
    TOUR_API_SERVICE_KEY_ENCODED: values.TOUR_API_SERVICE_KEY_ENCODED,
    EXPRESSWAY_API_KEY: values.EXPRESSWAY_API_KEY,
    ODSAY_API_KEY: values.ODSAY_API_KEY,
    KAKAO_MAP_JAVASCRIPT_KEY: values.KAKAO_MAP_JAVASCRIPT_KEY,
    KAKAO_REST_API_KEY: values.KAKAO_REST_API_KEY,
    KORAIL_API_KEY: values.KORAIL_API_KEY,
    TAGO_API_KEY: values.TAGO_API_KEY,
    SANITARY_SUPPLY_API_URL: values.SANITARY_SUPPLY_API_URL,
    WASTE_BIN_API_URL: values.WASTE_BIN_API_URL,
    WASTE_BIN_API_SOURCE: values.WASTE_BIN_API_SOURCE,
  };
}
