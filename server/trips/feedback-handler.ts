import { clean, json, readTrustedJson } from "../shared/http";
import { ensureTripDatabase } from "./database";
import { feedbackWriteRejection } from "./write-budget";

export async function handleFeedbackApi(request: Request) {
  if (request.method !== "POST") return json({ error: "POST 요청만 지원합니다." }, 405);
  const parsed = await readTrustedJson(request, 4000);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  const placeId = clean(body?.placeId, 80);
  const placeName = clean(body?.placeName, 100);
  const field = clean(body?.field || "접근성 정보", 60);
  const message = clean(body?.message, 800);
  if (!placeId || !placeName || message.length < 5) {
    return json({ error: "장소와 5자 이상의 제보 내용을 입력해 주세요." }, 400);
  }
  const sql = await ensureTripDatabase();
  if (!sql) return json({ error: "접근성 제보 보관 기능을 준비 중입니다." }, 503);
  const rejection = await feedbackWriteRejection(sql);
  if (rejection) return rejection;
  const id = crypto.randomUUID();
  await sql`INSERT INTO place_feedback (id, place_id, place_name, field, message, status, created_at) VALUES (${id}, ${placeId}, ${placeName}, ${field}, ${message}, 'received', ${Date.now()})`;
  return json({ ok: true, id }, 201);
}
