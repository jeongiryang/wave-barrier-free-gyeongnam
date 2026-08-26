import {
  exceededWriteWindow,
  retryAfterSeconds,
  FEEDBACK_WRITE_BUDGET,
  TRIP_WRITE_BUDGET,
} from "../../lib/trips/write-budget.js";
import type { TripSql } from "./database";

type WindowRow = { burst: number | string; sustained: number | string };

function tooManyWrites(retryAfter: number, message: string) {
  return new Response(JSON.stringify({ error: message, retryAfter }), {
    status: 429,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "retry-after": String(retryAfter),
    },
  });
}

/**
 * 익명 저장 경로는 작성자가 없어 커뮤니티처럼 계정별 제한을 걸 수 없다.
 * 저장소 전체의 최근 쓰기량을 한 번의 질의로 세어 예산을 넘으면 429로 돌린다.
 */
export async function sharedTripWriteRejection(sql: TripSql) {
  const now = Date.now();
  const rows = await sql`SELECT
    COUNT(*) FILTER (WHERE created_at > ${now - TRIP_WRITE_BUDGET.burst.windowMs}) AS burst,
    COUNT(*) FILTER (WHERE created_at > ${now - TRIP_WRITE_BUDGET.sustained.windowMs}) AS sustained
    FROM itineraries` as WindowRow[];
  const window = exceededWriteWindow(TRIP_WRITE_BUDGET, {
    burst: Number(rows[0]?.burst || 0),
    sustained: Number(rows[0]?.sustained || 0),
  });
  if (!window) return null;
  return tooManyWrites(
    retryAfterSeconds(TRIP_WRITE_BUDGET, window),
    "지금은 여행 공유 저장이 몰려 있습니다. 잠시 후 다시 시도해 주세요.",
  );
}

export async function feedbackWriteRejection(sql: TripSql) {
  const now = Date.now();
  const rows = await sql`SELECT
    COUNT(*) FILTER (WHERE created_at > ${now - FEEDBACK_WRITE_BUDGET.burst.windowMs}) AS burst,
    COUNT(*) FILTER (WHERE created_at > ${now - FEEDBACK_WRITE_BUDGET.sustained.windowMs}) AS sustained
    FROM place_feedback` as WindowRow[];
  const window = exceededWriteWindow(FEEDBACK_WRITE_BUDGET, {
    burst: Number(rows[0]?.burst || 0),
    sustained: Number(rows[0]?.sustained || 0),
  });
  if (!window) return null;
  return tooManyWrites(
    retryAfterSeconds(FEEDBACK_WRITE_BUDGET, window),
    "지금은 접근성 제보가 몰려 있습니다. 잠시 후 다시 시도해 주세요.",
  );
}
