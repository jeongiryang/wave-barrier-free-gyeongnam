/**
 * 서버 응답의 링크를 현재 서비스 origin 안으로 제한한다. 악성·오설정 응답이
 * 외부 로그인 또는 공유 화면으로 사용자를 보내지 못하게 한다.
 * @param {unknown} value
 * @param {string} currentOrigin
 */
export function sameOriginHttpUrl(value, currentOrigin) {
  try {
    const base = new URL(currentOrigin);
    if (!["http:", "https:"].includes(base.protocol)) return null;
    const candidate = new URL(String(value ?? ""), base);
    if (!["http:", "https:"].includes(candidate.protocol) || candidate.origin !== base.origin) return null;
    candidate.username = "";
    candidate.password = "";
    candidate.hash = "";
    return candidate.href;
  } catch {
    return null;
  }
}
