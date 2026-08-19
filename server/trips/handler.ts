import { neon } from "@neondatabase/serverless";
import type { Env } from "../shared/env";
import { clean, json, readTrustedJson } from "../shared/http";
import {
  buildPlan,
  restoreSharedPlan,
} from "../tourism/handler";
import { contentTypes, languageServices, profileFields, regionCodes } from "../tourism/catalog";

function database() {
  const url = typeof process === "undefined" ? "" : process.env.DATABASE_URL?.trim();
  return url ? neon(url) : null;
}

async function ensureDb() {
  const sql = database();
  if (!sql) return null;
  await sql`CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY,
    payload JSONB NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
  )`;
  await sql`CREATE INDEX IF NOT EXISTS itineraries_expires_idx ON itineraries (expires_at)`;
  await sql`CREATE TABLE IF NOT EXISTS place_feedback (
    id TEXT PRIMARY KEY,
    place_id TEXT NOT NULL,
    place_name TEXT NOT NULL,
    field TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    created_at BIGINT NOT NULL
  )`;
  return sql;
}

export async function handleTripsApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const id = clean(url.pathname.split("/").filter(Boolean)[2], 64);
  try {
  if (request.method === "GET") {
    if (!id) return json({ error: "공유 여행 ID가 필요합니다." }, 400);
    const sql = await ensureDb();
    if (!sql) return json({ error: "공유 여행 보관 기능을 준비 중입니다." }, 503);
    const rows = await sql`SELECT payload, created_at, expires_at FROM itineraries WHERE id = ${id} AND expires_at > ${Date.now()} LIMIT 1` as Array<{ payload: Record<string, unknown>; created_at: number | string; expires_at: number | string }>;
    const row = rows[0];
    if (!row) return json({ error: "공유 여행을 찾을 수 없거나 보관 기간이 지났습니다." }, 404);
    const saved = row.payload || {};
    const selections = (saved.selections || {}) as Record<string, unknown>;
    const params = new URLSearchParams({
      region: clean(selections.region, 20),
      theme: clean(selections.theme, 20),
      profiles: Array.isArray(selections.profiles) ? selections.profiles.map((value) => clean(value, 20)).join(",") : "",
      locale: clean(selections.locale || "ko", 20),
    });
    const currentPlanPromise = buildPlan(new Request(`${url.origin}/api/wave?${params.toString()}`), env);
    const restored = await restoreSharedPlan(env, saved, selections, currentPlanPromise);
    return json({ id, ...saved, ...restored, createdAt: Number(row.created_at), expiresAt: Number(row.expires_at) }, 200, true);
  }
  if (request.method !== "POST") return json({ error: "지원하지 않는 요청입니다." }, 405);
  const parsed = await readTrustedJson(request, 70000);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  if (typeof body.selections !== "object" || !body.selections || Array.isArray(body.selections)) return json({ error: "저장할 여행 조건이 필요합니다." }, 400);

  const rawSelections = body.selections as Record<string, unknown>;
  const requestedRegion = clean(rawSelections.region, 20);
  const requestedTheme = clean(rawSelections.theme, 20);
  const requestedLocale = clean(rawSelections.locale || "ko", 20);
  const rawProfiles = Array.isArray(rawSelections.profiles) ? rawSelections.profiles : [];
  const rawAssignments = rawSelections.scheduleAssignments && typeof rawSelections.scheduleAssignments === "object" && !Array.isArray(rawSelections.scheduleAssignments)
    ? rawSelections.scheduleAssignments as Record<string, unknown>
    : {};
  const rawSelectedPlaceIds = Array.isArray(rawSelections.selectedPlaceIds) ? rawSelections.selectedPlaceIds : [];
  const date = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(clean(value, 10)) ? clean(value, 10) : "";
  const selections = {
    region: regionCodes[requestedRegion] ? requestedRegion : "창원",
    theme: contentTypes[requestedTheme] ? requestedTheme : "nature",
    profiles: [...new Set(rawProfiles.map((value) => clean(value, 20)).filter((value) => profileFields[value]))].slice(0, 6),
    locale: languageServices[requestedLocale] ? requestedLocale : "ko",
    travelStart: date(rawSelections.travelStart),
    travelEnd: date(rawSelections.travelEnd),
    scheduleAssignments: Object.fromEntries(Object.entries(rawAssignments).slice(0, 12).map(([placeId, assignedDate]) => [clean(placeId, 80), date(assignedDate)]).filter(([placeId, assignedDate]) => placeId && assignedDate)),
    selectedPlaceIds: [...new Set(rawSelectedPlaceIds.map((value) => clean(value, 80)).filter(Boolean))].slice(0, 12),
  };

  const sql = await ensureDb();
  if (!sql) return json({ error: "공유 여행 보관 기능을 준비 중입니다." }, 503);
  const plan = (body.plan && typeof body.plan === "object" ? body.plan : {}) as Record<string, unknown>;
  const places = Array.isArray(plan.places) ? plan.places as Array<Record<string, unknown>> : [];
  const origin = (body.origin && typeof body.origin === "object" ? body.origin : {}) as Record<string, unknown>;
  const selectedIds = new Set(selections.selectedPlaceIds);
  const selectedPlaces = selectedIds.size ? places.filter((place) => selectedIds.has(clean(place.id, 80))) : places;
  const payloadObject = {
    selections,
    origin: { label: clean(origin.label || "선택 출발지", 80) },
    placeRefs: (selectedPlaces.length ? selectedPlaces : places).slice(0, 6).map((place, order) => ({ contentId: clean(place.id, 80), order })),
  };
  const payload = JSON.stringify(payloadObject);
  if (payload.length > 65000) return json({ error: "여행 계획이 너무 큽니다." }, 413);
  const newId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const now = Date.now();
  const expiresAt = now + 1000 * 60 * 60 * 24 * 30;
  await sql`INSERT INTO itineraries (id, payload, created_at, expires_at) VALUES (${newId}, ${payload}::jsonb, ${now}, ${expiresAt})`;
  return json({ id: newId, url: `${url.origin}/trip/${newId}`, expiresAt }, 201);
  } catch {
    return json({ error: request.method === "GET"
      ? "공유 여행을 불러오는 중 연결이 지연됐습니다. 잠시 후 다시 시도해 주세요."
      : "공유 여행을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 502);
  }
}

export async function handleFeedbackApi(request: Request) {
  if (request.method !== "POST") return json({ error: "POST 요청만 지원합니다." }, 405);
  const parsed = await readTrustedJson(request, 4000);
  if (parsed.response) return parsed.response;
  const body = parsed.body;
  const placeId = clean(body?.placeId, 80); const placeName = clean(body?.placeName, 100);
  const field = clean(body?.field || "접근성 정보", 60); const message = clean(body?.message, 800);
  if (!placeId || !placeName || message.length < 5) return json({ error: "장소와 5자 이상의 제보 내용을 입력해 주세요." }, 400);
  const sql = await ensureDb();
  if (!sql) return json({ error: "접근성 제보 보관 기능을 준비 중입니다." }, 503);
  const id = crypto.randomUUID();
  await sql`INSERT INTO place_feedback (id, place_id, place_name, field, message, status, created_at) VALUES (${id}, ${placeId}, ${placeName}, ${field}, ${message}, 'received', ${Date.now()})`;
  return json({ ok: true, id }, 201);
}
