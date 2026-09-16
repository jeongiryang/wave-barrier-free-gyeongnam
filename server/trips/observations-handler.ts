import { optionalCommunityUser } from "../../features/community/server/session";
import { observationInput, OBSERVATION_TTL } from "../../lib/experience.js";
import { rateLimitResponse } from "../../lib/rate-limit-response.js";
import { json, readTrustedJson } from "../shared/http";
import { experienceDatabase } from "./experience-database";

export async function handleObservations(request: Request) {
  try {
    const url = new URL(request.url);
    if (!["GET", "POST"].includes(request.method))
      return json({ error: "지원하지 않는 요청입니다." }, 405);
    const parsed =
      request.method === "POST" ? await readTrustedJson(request, 3000) : null;
    if (parsed?.response) return parsed.response;
    const user =
      request.method === "POST" ? await optionalCommunityUser(request) : null;
    if (request.method === "POST" && !user)
      return json({ error: "현장 공유는 로그인 후 이용해 주세요." }, 401);
    const sql = await experienceDatabase();
    if (!sql)
      return json({ error: "현장 정보 저장소에 연결하지 못했어요." }, 503);
    const now = Date.now();
    if (request.method === "GET") {
      const ids = [...new Set((url.searchParams.get("ids") || "").split(","))];
      if (ids.length > 12 || ids.some((id) => !/^\d{1,20}$/.test(id)))
        return json({ error: "조회할 장소를 확인해 주세요." }, 400);
      const rows =
        await sql`SELECT id, place_id AS "placeId", observed_at AS "observedAt", readings FROM (SELECT DISTINCT ON (author_id, place_id) id, place_id, observed_at, readings FROM wave_observations WHERE place_id = ANY(${ids}) AND observed_at > ${now - OBSERVATION_TTL} AND observed_at <= ${now} ORDER BY author_id, place_id, observed_at DESC, created_at DESC) latest ORDER BY observed_at DESC LIMIT 120`;
      return json({
        reports: rows.map((row) => ({
          ...row,
          observedAt: Number(row.observedAt),
        })),
        checkedAt: now,
        source: "traveller",
        ttl: OBSERVATION_TTL,
      });
    }
    if (parsed!.body.operation === "remove") {
      const placeId = parsed!.body.placeId;
      if (typeof placeId !== "string" || !/^\d{1,20}$/.test(placeId))
        return json({ error: "장소를 확인해 주세요." }, 400);
      await sql`DELETE FROM wave_observations WHERE author_id = ${user!.id} AND place_id = ${placeId}`;
      return json({ ok: true });
    }
    let value;
    try {
      value = observationInput(parsed!.body, now);
    } catch (error) {
      return json({ error: (error as Error).message }, 400);
    }
    // Bound authored observations per hour.
    const recent =
      await sql`SELECT COUNT(*) AS count FROM wave_observations WHERE author_id = ${user!.id} AND created_at > ${now - 3600000}`;
    if (Number(recent[0]?.count) >= 12)
      return rateLimitResponse(
        "한 시간에 12곳까지 공유할 수 있어요. 잠시 뒤 다시 시도해 주세요.",
        3600,
      );
    const id = crypto.randomUUID();
    await sql`INSERT INTO wave_observations (id, author_id, place_id, observed_at, created_at, readings) VALUES (${id}, ${user!.id}, ${value.placeId}, ${value.observedAt}, ${now}, ${JSON.stringify(value.readings)}::jsonb)`;
    return json({ id, ...value }, 201);
  } catch {
    return json(
      { error: "현장 정보를 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요." },
      502,
    );
  }
}
