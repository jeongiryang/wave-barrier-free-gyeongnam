import { cacheControlHeader } from "../../lib/http-cache.js";

export function json(data: unknown, status = 200, cache = false) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControlHeader(cache, status),
      "x-content-type-options": "nosniff",
    },
  });
}

export function clean(value: unknown, max = 240) {
  return String(value ?? "")
    .replace(/<br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function httpsUrl(value: unknown) {
  const text = clean(value, 500);
  if (!text) return "";
  try {
    const url = new URL(text);
    if (url.protocol === "http:") url.protocol = "https:";
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

type JsonBodyResult =
  | { body: Record<string, unknown>; response?: never }
  | { body?: never; response: Response };

export async function readTrustedJson(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("application/json")) {
    return { response: json({ error: "JSON 형식의 요청만 지원합니다." }, 415) };
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { response: json({ error: "요청 내용이 너무 큽니다." }, 413) };
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return { response: json({ error: "다른 사이트에서 보낸 저장 요청은 허용하지 않습니다." }, 403) };
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return { response: json({ error: "다른 사이트에서 보낸 저장 요청은 허용하지 않습니다." }, 403) };
  }

  const raw = await request.text().catch(() => "");
  if (!raw || new TextEncoder().encode(raw).byteLength > maxBytes) {
    return { response: json({ error: raw ? "요청 내용이 너무 큽니다." : "요청 내용을 확인해 주세요." }, raw ? 413 : 400) };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    return { body: parsed as Record<string, unknown> };
  } catch {
    return { response: json({ error: "올바른 JSON 요청이 아닙니다." }, 400) };
  }
}
