import type { Env } from "../shared/env";
import { clean, json, readTrustedJson } from "../shared/http";
import { recordOperationalEvent } from "../shared/observability";
import { buildPlan } from "../tourism/plan-builder";
import { restoreSharedPlan } from "../tourism/shared-plan-restoration";
import { ensureTripDatabase, sweepExpiredTrips } from "./database";
import { normalizeTripSelections, storedTripPayload } from "./payload";
import { SAVE_PATH_SWEEP_LIMIT } from "../../lib/trips/retention.js";
import { sharedTripWriteRejection } from "./write-budget";

type StoredTripRow = {
  payload: Record<string, unknown>;
  created_at: number | string;
  expires_at: number | string;
};

export async function loadSharedTrip(request: Request, env: Env, id: string, url: URL) {
  if (!id) return json({ error: "공유 여행 ID가 필요합니다." }, 400);
  const sql = await ensureTripDatabase();
  if (!sql) return json({ error: "공유 여행 보관 기능을 준비 중입니다." }, 503);
  const rows = await sql`SELECT payload, created_at, expires_at FROM itineraries WHERE id = ${id} AND expires_at > ${Date.now()} LIMIT 1` as StoredTripRow[];
  const row = rows[0];
  if (!row) return json({ error: "공유 여행을 찾을 수 없거나 보관 기간이 지났습니다." }, 404);

  const saved = row.payload || {};
  const selections = (saved.selections || {}) as Record<string, unknown>;
  const params = new URLSearchParams({
    region: clean(selections.region, 20),
    themes: Array.isArray(selections.themes) ? selections.themes.join(",") : clean(selections.theme, 100),
    profiles: Array.isArray(selections.profiles)
      ? selections.profiles.map((value) => clean(value, 20)).join(",")
      : "",
    locale: clean(selections.locale || "ko", 20),
  });
  const currentPlan = buildPlan(new Request(`${url.origin}/api/wave?${params.toString()}`), env);
  const restored = await restoreSharedPlan(env, saved, selections, currentPlan);
  return json({
    id,
    ...saved,
    ...restored,
    createdAt: Number(row.created_at),
    expiresAt: Number(row.expires_at),
  }, 200, true);
}

export async function saveSharedTrip(request: Request, url: URL) {
  const parsed = await readTrustedJson(request, 70000);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  if (typeof body.selections !== "object" || !body.selections || Array.isArray(body.selections)) {
    return json({ error: "저장할 여행 조건이 필요합니다." }, 400);
  }

  const selections = normalizeTripSelections(body.selections as Record<string, unknown>);
  const sql = await ensureTripDatabase();
  if (!sql) return json({ error: "공유 여행 보관 기능을 준비 중입니다." }, 503);
  const rejection = await sharedTripWriteRejection(sql);
  if (rejection) return rejection;
  const payload = JSON.stringify(storedTripPayload(body, selections));
  if (payload.length > 65000) return json({ error: "여행 계획이 너무 큽니다." }, 413);

  const id = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const now = Date.now();
  const expiresAt = now + 1000 * 60 * 60 * 24 * 30;
  await sql`INSERT INTO itineraries (id, payload, created_at, expires_at) VALUES (${id}, ${payload}::jsonb, ${now}, ${expiresAt})`;
  // 예약 정리 사이의 만료 행도 저장 요청에 얹어 지운다. 사람이 응답을 기다리는
  // 경로이므로 지우는 양을 묶는다. 정리에 실패해도 방금 저장한 여행을 돌려주지
  // 못할 이유는 없다.
  await sweepExpiredTrips(sql, now, SAVE_PATH_SWEEP_LIMIT).catch(() => {
    recordOperationalEvent("trip_retention", { status: "failed", trigger: "save" });
    return 0;
  });
  return json({ id, url: `${url.origin}/trip/${id}`, expiresAt }, 201);
}
