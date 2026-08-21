import { clean } from "../shared/http";
import { FIELD_SCAN_SYSTEM_PROMPT, FIELD_SCAN_USER_PROMPT } from "./prompt";

/**
 * Gemini 이미지 판독 호출.
 *
 * 이 저장소는 모든 외부 제공자(TourAPI·Kakao·ODsay·Open-Meteo)를 SDK 없이
 * fetch로 호출한다. Gemini도 같은 방식으로 붙여 의존성을 늘리지 않는다.
 * 인증키는 서버 환경 변수에서만 읽고 응답·로그 어디에도 싣지 않는다.
 */

export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

export type GeminiVisionResult =
  | { ok: true; value: unknown; model: string }
  | { ok: false; error: string; status: number };

function endpoint(model: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

/** 모델이 코드펜스를 붙여 보내는 경우가 있어 JSON 본문만 떼어낸다. */
function parseJsonPayload(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  if (!trimmed) throw new Error("empty");
  return JSON.parse(trimmed);
}

export async function analyzeFieldPhoto(
  { apiKey, model, imageBase64, mimeType }: { apiKey: string; model: string; imageBase64: string; mimeType: string },
): Promise<GeminiVisionResult> {
  const selected = model || DEFAULT_GEMINI_MODEL;
  let response: Response;
  try {
    response = await fetch(endpoint(selected), {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: FIELD_SCAN_SYSTEM_PROMPT }] },
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: FIELD_SCAN_USER_PROMPT },
          ],
        }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    });
  } catch {
    // 인증키가 섞일 수 있는 원본 오류는 밖으로 내보내지 않는다.
    return { ok: false, error: "현장 사진 분석 요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.", status: 504 };
  }

  if (!response.ok) {
    const detail = response.status === 429
      ? "분석 요청이 많아 잠시 후 다시 시도해 주세요."
      : response.status === 400 || response.status === 403
        ? "현장 분석 기능의 인증 설정을 확인해 주세요."
        : "현장 사진 분석 제공자의 응답을 확인해 주세요.";
    return { ok: false, error: detail, status: 502 };
  }

  let body: Record<string, unknown>;
  try {
    body = await response.json() as Record<string, unknown>;
  } catch {
    return { ok: false, error: "현장 사진 분석 결과를 읽지 못했습니다.", status: 502 };
  }

  const candidates = Array.isArray(body.candidates) ? body.candidates as Array<Record<string, unknown>> : [];
  const content = (candidates[0]?.content || {}) as Record<string, unknown>;
  const parts = Array.isArray(content.parts) ? content.parts as Array<Record<string, unknown>> : [];
  const textPart = parts.map((part) => clean(part.text, 20000)).find(Boolean) || "";
  if (!textPart) {
    return { ok: false, error: "현장 사진에서 확인할 수 있는 내용을 찾지 못했습니다. 다시 촬영해 주세요.", status: 502 };
  }

  try {
    return { ok: true, value: parseJsonPayload(textPart), model: selected };
  } catch {
    return { ok: false, error: "현장 사진 분석 결과 형식을 확인하지 못했습니다. 다시 시도해 주세요.", status: 502 };
  }
}
