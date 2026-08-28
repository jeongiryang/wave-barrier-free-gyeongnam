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
    const error = /** @type {Record<string, unknown>} */ (rawError);
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
  const paths = result && Array.isArray(result.path) ? result.path : [];
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
    const code = error.code ? ` (${error.code})` : "";
    return { state: "error", detail: `ODsay 응답 오류${code}: ${error.message}` };
  }
  if (routeCount > 0) {
    return { state: "connected", detail: `대중교통 경로 ${routeCount}개를 확인했습니다.` };
  }
  return { state: "ready", detail: "이 구간에서 제공되는 대중교통 경로가 없습니다." };
}
