/**
 * 세션·계정 프록시 응답은 성공 여부와 관계없이 공유 캐시에 저장하지 않는다.
 * Neon Auth가 돌려준 Set-Cookie와 stream을 보존하기 위해 기존 Response의 mutable
 * headers를 우선 갱신하고, immutable 응답인 경우에만 같은 본문으로 감싼다.
 * @param {Response} response
 */
export function privateAuthResponse(response) {
  const secureHeaders = (headers) => {
    headers.set("Cache-Control", "private, no-store");
    // CDN 전용 지시자가 일반 Cache-Control보다 우선하지 못하게 제거한다.
    headers.delete("CDN-Cache-Control");
    headers.delete("Vercel-CDN-Cache-Control");
    headers.delete("Surrogate-Control");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    headers.set("X-Content-Type-Options", "nosniff");
    const vary = headers.get("Vary")?.split(",").map((item) => item.trim()).filter(Boolean) || [];
    if (!vary.some((item) => item.toLowerCase() === "cookie")) vary.push("Cookie");
    headers.set("Vary", vary.join(", "));
  };
  try {
    secureHeaders(response.headers);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    secureHeaders(headers);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}
