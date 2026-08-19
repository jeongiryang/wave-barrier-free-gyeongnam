type JsonResult = { body: Record<string, unknown>; response?: never } | { body?: never; response: Response };

function error(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function readSameOriginJson(request: Request, maxBytes: number): Promise<JsonResult> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) return { response: error("JSON 형식의 요청만 지원합니다.", 415) };
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return { response: error("요청 내용이 너무 큽니다.", 413) };
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) return { response: error("다른 사이트에서 보낸 요청은 허용하지 않습니다.", 403) };
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return { response: error("다른 사이트에서 보낸 요청은 허용하지 않습니다.", 403) };
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
