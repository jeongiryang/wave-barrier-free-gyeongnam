/**
 * 로그인·회원가입 후 되돌아갈 경로를 같은 출처 안으로 가둔다.
 *
 * 문자열 앞부분만 검사하면 `/\evil.com` 같은 값이 통과한다. WHATWG URL 파서는
 * 백슬래시를 슬래시로 정규화하므로 브라우저는 이 값을 `https://evil.com`으로
 * 해석하고, 로그인 화면이 외부 도메인으로 사용자를 넘기는 통로가 된다.
 * 실제로 해석해 보고 출처가 그대로인 경로만 돌려준다.
 */
export const AUTH_FALLBACK_PATH = "/community";

export function safeAuthReturnPath(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return AUTH_FALLBACK_PATH;
  const base = "https://wave.invalid";
  try {
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return AUTH_FALLBACK_PATH;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return AUTH_FALLBACK_PATH;
  }
}
