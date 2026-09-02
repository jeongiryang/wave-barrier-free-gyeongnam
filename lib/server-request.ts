type JsonResult = { body: Record<string, unknown>; response?: never } | { body?: never; response: Response };

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function error(message: string, status: number) {
  return Response.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

async function exceedsBodyLimit(request: Request, maxBytes: number) {
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
 * 브라우저에서 상태를 바꾸는 요청의 공통 경계다. 본문이 없는 좋아요 취소와 삭제도
 * JSON 파서 바깥에서 먼저 검사하며, Bearer 인증을 쓰는 migration/cron 경로에는
 * 적용하지 않는다.
 */
export async function verifySameOriginMutation(request: Request, maxBytes = 0): Promise<Response | null> {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) return null;
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) return error("다른 사이트에서 보낸 요청은 허용하지 않습니다.", 403);
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return error("다른 사이트에서 보낸 요청은 허용하지 않습니다.", 403);
  }
  if (maxBytes > 0) {
    const rawLength = request.headers.get("content-length");
    if (rawLength && (!/^\d+$/.test(rawLength) || Number(rawLength) > maxBytes)) {
      return error("요청 내용이 너무 큽니다.", 413);
    }
    if (await exceedsBodyLimit(request, maxBytes)) return error("요청 내용이 너무 큽니다.", 413);
  }
  return null;
}

export async function readSameOriginJson(request: Request, maxBytes: number): Promise<JsonResult> {
  const guard = await verifySameOriginMutation(request, maxBytes);
  if (guard) return { response: guard };
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) return { response: error("JSON 형식의 요청만 지원합니다.", 415) };
  const raw = await request.text().catch(() => "");
  if (!raw) return { response: error("요청 내용을 확인해 주세요.", 400) };
  if (new TextEncoder().encode(raw).byteLength > maxBytes) return { response: error("요청 내용이 너무 큽니다.", 413) };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    return { body: parsed as Record<string, unknown> };
  } catch {
    return { response: error("올바른 JSON 요청이 아닙니다.", 400) };
  }
}
