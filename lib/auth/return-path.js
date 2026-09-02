/** 로그인·회원가입 후 복귀 경로를 현재 출처 안으로 제한한다. */
export const AUTH_FALLBACK_PATH = "/community";

export function safeAuthReturnPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return AUTH_FALLBACK_PATH;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return AUTH_FALLBACK_PATH;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || decoded.startsWith("/\\") || /[\u0000-\u001f\u007f]/.test(decoded)) return AUTH_FALLBACK_PATH;
  } catch {
    return AUTH_FALLBACK_PATH;
  }
  const base = "https://wave.invalid";
  try {
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return AUTH_FALLBACK_PATH;
    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    // `/..//evil.example` 같은 값은 URL 정규화 뒤 `//evil.example`이 된다.
    // 이를 그대로 href/router에 넘기면 protocol-relative 외부 이동이 되므로 닫는다.
    if (!path.startsWith("/") || path.startsWith("//")) return AUTH_FALLBACK_PATH;
    return path;
  } catch {
    return AUTH_FALLBACK_PATH;
  }
}
