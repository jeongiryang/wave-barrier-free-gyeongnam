/**
 * 모든 쓰기 제한 응답은 브라우저와 자동 클라이언트가 같은 방식으로 재시도 시점을
 * 알 수 있게 JSON 본문과 표준 Retry-After 헤더를 함께 제공한다.
 * @param {string} message
 * @param {number} retryAfterSeconds
 */
export function rateLimitResponse(message, retryAfterSeconds) {
  const parsed = Math.ceil(Number(retryAfterSeconds));
  const retryAfter = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 86_400) : 60;
  return Response.json({ error: message, retryAfter }, {
    status: 429,
    headers: {
      "Cache-Control": "no-store",
      "Retry-After": String(retryAfter),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
