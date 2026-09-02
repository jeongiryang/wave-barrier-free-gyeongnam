/**
 * 인증 공급자의 내부 오류 코드·문장이나 계정 존재 여부를 브라우저에 구분해서
 * 노출하지 않는다. 연결 장애만 사용자가 재시도 시점을 판단할 수 있게 분리한다.
 * @param {unknown} value
 */
export function friendlyAuthError(value) {
  const raw = String(value ?? "");
  if (/fetch|network|503|unavailable/i.test(raw)) {
    return "계정 서비스 연결이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  }
  return "입력한 계정 정보를 확인한 뒤 다시 시도해 주세요.";
}
