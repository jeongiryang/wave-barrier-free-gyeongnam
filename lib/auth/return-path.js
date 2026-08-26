/** 로그인·회원가입 후 복귀 경로를 현재 출처 안으로 제한한다. */
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
