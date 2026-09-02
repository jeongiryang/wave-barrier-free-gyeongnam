const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function requestError(message, status) {
  return Response.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

/**
 * Content-Length가 없거나 거짓인 chunked 요청도 핸들러에 넘기기 전에 실제 바이트를
 * 센다. 원본 stream은 뒤의 인증/JSON 핸들러가 그대로 읽을 수 있게 clone만 검사한다.
 * @param {Request} request
 * @param {number} maxBytes
 */
async function exceedsBodyLimit(request, maxBytes) {
  if (!request.body || maxBytes <= 0) return false;
  const reader = request.clone().body?.getReader();
  if (!reader) return false;
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return false;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        // clone()의 다른 tee는 실제 핸들러가 뒤에서 읽는다. 여기서 cancel 완료를
        // 기다리면 다른 tee가 시작되기 전까지 교착될 수 있으므로 즉시 반환한다.
        void reader.cancel().catch(() => undefined);
        return true;
      }
    }
  } catch {
    void reader.cancel().catch(() => undefined);
    return true;
  }
}

/**
 * 브라우저 상태 변경 요청의 공통 CSRF·본문 크기 경계다. Bearer 인증을 쓰는
 * migration/cron 경로는 호출자가 별도로 보호하므로 이 함수의 대상이 아니다.
 * @param {Request} request
 * @param {number} [maxBytes]
 * @returns {Promise<Response | null>}
 */
export async function verifySameOriginMutation(request, maxBytes = 0) {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) return null;
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return requestError("다른 사이트에서 보낸 요청은 허용하지 않습니다.", 403);
  }
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return requestError("다른 사이트에서 보낸 요청은 허용하지 않습니다.", 403);
  }
  if (maxBytes > 0) {
    const rawLength = request.headers.get("content-length");
    if (rawLength && (!/^\d+$/.test(rawLength) || Number(rawLength) > maxBytes)) {
      return requestError("요청 내용이 너무 큽니다.", 413);
    }
    if (await exceedsBodyLimit(request, maxBytes)) {
      return requestError("요청 내용이 너무 큽니다.", 413);
    }
  }
  return null;
}
