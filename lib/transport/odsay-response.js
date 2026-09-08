/**
 * ODsay 응답 읽기.
 *
 * ODsay는 인증 실패나 조회 범위 초과를 HTTP 오류가 아니라 **200 + 오류 봉투**로
 * 돌려준다. 상태 코드만 보고 `result.path`를 읽으면 그 오류가 빈 배열이 되어,
 * "키가 없음", "키가 만료됨", "상류 장애", "이 구간에 경로가 없음"이 화면에서
 * 모두 같은 문구로 수렴한다. 운영자는 무엇을 고쳐야 하는지 알 수 없다.
 */

/**
 * @param {unknown} body
 * @returns {{ paths: Array<Record<string, unknown>>, error: { code: string, message: string } | null }}
 */
export function readOdsayResponse(body) {
  const envelope = body && typeof body === "object" ? /** @type {Record<string, unknown>} */ (body) : {};
  const rawError = envelope.error;
  if (rawError && typeof rawError === "object") {
    // The gateway sends error arrays; only one documented no-path error may
    // become empty. Multiple/invalid errors cannot authorize an empty result.
    const node = Array.isArray(rawError) ? rawError.length === 1 ? rawError[0] : null : rawError;
    if (!node || typeof node !== "object" || Array.isArray(node)) return {paths:[],error:{code:"INVALID_RESPONSE",message:"경로 응답 형식을 확인하지 못했습니다."}};
    const error = /** @type {Record<string, unknown>} */ (node);
    return {
      paths: [],
      error: {
        code: String(error.code ?? error.errorCode ?? "").slice(0, 40),
        message: String(error.msg ?? error.message ?? "ODsay가 오류를 돌려줬습니다.").slice(0, 120),
      },
    };
  }
  const result = envelope.result && typeof envelope.result === "object"
    ? /** @type {Record<string, unknown>} */ (envelope.result)
    : null;
  if (!result || !Array.isArray(result.path)) {
    return { paths: [], error: { code: "INVALID_RESPONSE", message: "경로 응답 형식을 확인하지 못했습니다." } };
  }
  // Intercity results cover terminals only; they cannot confirm the requested whole leg.
  if (result.searchType === 1 || result.searchType === 2) {
    return { paths: [], error: { code: "INTERCITY_INCOMPLETE", message: "터미널 앞뒤 이동 확인이 필요합니다." } };
  }
  const paths = result.path;
  return { paths, error: null };
}

/**
 * 호출 결과를 제공기관 상태로 옮긴다. 키가 없으면 기존 "선택 사항" 표시를
 * 그대로 두어야 하므로 null을 돌려준다.
 *
 * @param {{ configured: boolean, error?: { code: string, message: string } | null, failure?: string, routeCount?: number }} outcome
 * @returns {{ state: "connected" | "ready" | "error", detail: string } | null}
 */
export function odsayProviderStatus({ configured, error = null, failure = "", routeCount = 0 }) {
  if (!configured) return null;
  if (failure) return { state: "error", detail: failure.slice(0, 120) };
  if (error) {
    if (["3", "4", "5", "6", "-98", "-99"].includes(error.code)) {
      return { state: "ready", detail: "이 구간에서 제공되는 대중교통 경로가 없습니다. 출발·도착 장소를 바꾸거나 외부 지도에서 확인해 주세요." };
    }
    if (error.code === "INTERCITY_INCOMPLETE") {
      return { state: "error", detail: "터미널 앞뒤 이동을 포함한 전체 경로는 아직 확인되지 않았습니다. 외부 지도에서 이어지는 이동을 확인해 주세요." };
    }
    const validationDetails = {
      MISSING_COORDINATES: "승하차 정류장의 위치가 빠져 전체 경로를 확인하지 못했습니다. 외부 지도에서 확인해 주세요.",
      OUTSIDE_COORDINATES: "승하차 정류장의 위치가 지원 좌표 범위를 벗어나 경로를 확인하지 못했습니다. 외부 지도에서 확인해 주세요.",
      ENDPOINT_MISMATCH: "요청한 출발·도착 장소와 정류장의 연결을 확인하지 못했습니다. 외부 지도에서 앞뒤 이동을 확인해 주세요.",
      MISSING_CONNECTION: "도보·환승 구간의 연결이 확인되지 않아 전체 경로로 표시하지 않습니다. 외부 지도에서 이어지는 이동을 확인해 주세요.",
      INVALID_ROUTE: "경로의 필수 정보가 불완전해 전체 이동을 확인하지 못했습니다. 외부 지도에서 확인해 주세요.",
    };
    if (Object.hasOwn(validationDetails, error.code)) {
      return { state: "error", detail: validationDetails[/** @type {keyof typeof validationDetails} */ (error.code)] };
    }
    // Provider messages can echo request values. Never expose them or arbitrary codes.
    return { state: "error", detail: "대중교통 경로 응답을 확인하지 못했습니다. 잠시 후 다시 시도하거나 외부 지도에서 확인해 주세요." };
  }
  if (routeCount > 0) {
    return { state: "connected", detail: `대중교통 경로 ${routeCount}개를 확인했습니다.` };
  }
  return { state: "ready", detail: "이 구간에서 제공되는 대중교통 경로가 없습니다." };
}
