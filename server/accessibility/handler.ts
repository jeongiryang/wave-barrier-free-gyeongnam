import { combineOfficialAndFieldEvidence, normalizeVisionAnalysis } from "../../lib/accessibility-vision.js";
import type { Env } from "../shared/env";
import { clean, json, readTrustedJson } from "../shared/http";
import { analyzeFieldPhoto, DEFAULT_GEMINI_MODEL } from "./gemini";
import { digestImage, saveScan } from "./scan-store";

/** base64로 4.5MB. 원본 사진 기준 약 3MB까지 받는다. */
const MAX_SCAN_BYTES = 4_500_000;

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

type ScanBody = {
  placeId?: unknown;
  placeName?: unknown;
  image?: unknown;
  mimeType?: unknown;
  profiles?: unknown;
  official?: unknown;
};

/** data URL로 오든 순수 base64로 오든 같은 형태로 받는다. */
function readImage(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return { data: "", mimeType: "" };
  const match = raw.match(/^data:([\w/+.-]+);base64,([\s\S]+)$/);
  if (match) return { data: match[2].replace(/\s+/g, ""), mimeType: match[1].toLowerCase() };
  return { data: raw.replace(/\s+/g, ""), mimeType: "" };
}

export async function handleAccessibilityScanApi(request: Request, env: Env) {
  if (request.method !== "POST") return json({ error: "POST 요청만 지원합니다." }, 405);

  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) return json({ error: "현장 접근성 분석 기능이 아직 연결되지 않았습니다." }, 503);

  const parsed = await readTrustedJson(request, MAX_SCAN_BYTES);
  if (parsed.response) return parsed.response;
  const body = parsed.body as ScanBody;

  const placeId = clean(body.placeId, 80);
  const placeName = clean(body.placeName, 100);
  if (!placeId || !placeName) return json({ error: "분석할 관광지 정보가 필요합니다." }, 400);

  const image = readImage(body.image);
  const mimeType = (clean(body.mimeType, 40) || image.mimeType || "image/jpeg").toLowerCase();
  if (!image.data) return json({ error: "분석할 사진을 첨부해 주세요." }, 400);
  if (!ALLOWED_MIME.includes(mimeType)) {
    return json({ error: "JPEG, PNG, WebP 형식의 사진만 분석할 수 있습니다." }, 415);
  }
  if (image.data.length > MAX_SCAN_BYTES) {
    return json({ error: "사진 용량이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요." }, 413);
  }

  const profiles = Array.isArray(body.profiles) ? body.profiles.map((value) => clean(value, 20)).filter(Boolean).slice(0, 6) : [];

  const result = await analyzeFieldPhoto({ apiKey, model: env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL, imageBase64: image.data, mimeType });
  if (!result.ok) return json({ error: result.error }, result.status);

  const analysis = normalizeVisionAnalysis(result.value, { model: result.model });

  // 사진 상태가 나쁘면 판독 결과를 만들지 않고 재촬영을 안내한다.
  if (!analysis.usable) {
    return json({ scanId: null, stored: false, analysis, retakeGuidance: analysis.retakeGuidance }, 200);
  }

  const official = body.official && typeof body.official === "object" && !Array.isArray(body.official)
    ? body.official as Record<string, unknown>
    : { name: placeName };
  const combined = combineOfficialAndFieldEvidence(official, analysis, profiles);

  const digest = await digestImage(image.data);
  const saved = await saveScan({ placeId, placeName, imageDigest: digest, analysis });

  return json({
    scanId: saved.id,
    stored: saved.stored,
    analysis,
    officialData: combined.official,
    conflicts: combined.conflicts,
    guidance: combined.guidance,
  }, 200);
}
