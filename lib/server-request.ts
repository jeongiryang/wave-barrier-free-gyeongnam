import { verifySameOriginMutation } from "./security/request-boundaries.js";

type JsonResult = { body: Record<string, unknown>; response?: never } | { body?: never; response: Response };

export { verifySameOriginMutation } from "./security/request-boundaries.js";

function error(message: string, status: number) {
  return Response.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
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
