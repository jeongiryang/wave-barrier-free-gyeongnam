import { requiredCommunityUser } from "../../features/community/server/session";
import { readSameOriginJson } from "../../lib/server-request";
import { accountTravelRepository } from "../../lib/account-travel/database.js";
import { TravelError } from "../../lib/account-travel/model.js";
import { profileFields } from "../tourism/catalog";
import { portableEnv } from "../shared/env";
import { attemptProvider, commonParams, fetchTourismData } from "../shared/provider-data";
import { placeFrom } from "../tourism/accessibility-model";

function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", ...(status === 429 ? { "Retry-After": "60" } : {}) } });
}

export async function accountTravelHandler(request: Request) {
  let body: Record<string, unknown> = {};
  if (request.method !== "GET") {
    const parsed = await readSameOriginJson(request, 16000);
    if (parsed.response) return parsed.response;
    body = parsed.body;
  }
  const session = await requiredCommunityUser();
  if (!session.user) return response({ error: "여행을 이어가려면 로그인해 주세요." }, session.error === "unavailable" ? 503 : 401);
  const userId = session.user.id;
  const [, tail = ""] = new URL(request.url).pathname.split("/api/account/travel");
  const [id, action] = tail.split("/").filter(Boolean);
  try {
    const repo = accountTravelRepository();
    if (id === "preferences") {
      if (request.method === "GET") return response(await repo.preferences(userId));
      if (request.method !== "POST" || !Array.isArray(body.selectedIds) || body.selectedIds.length > 6 || body.selectedIds.some(id => typeof id !== "string" || !profileFields[id]) || !Number.isInteger(body.revision) || Number(body.revision) < 0) return response({ error: "편의 조건을 확인해 주세요." }, 400);
      return response(await repo.savePreferences(userId, [...new Set(body.selectedIds)], body.revision));
    }
    if (request.method === "GET") {
      if (!id) return response({ trips: await repo.list(userId) });
      if (action) return response({ error: "지원하지 않는 요청입니다." }, 405);
      return response(await repo.get(userId, id));
    }
    if (request.method !== "POST") return response({ error: "지원하지 않는 요청입니다." }, 405);
    if (!id) return response(await repo.create(userId, body.id, body.payload), 201);
    if (action === "join") return response(await repo.join(userId, id, body.token, body.name));
    if (action === "invitation") {
      if (typeof body.enabled !== "boolean") return response({ error: "초대 설정을 확인해 주세요." }, 400);
      return response({ token: await repo.invitation(userId, id, body.enabled) });
    }
    if (action === "participate") { await repo.participate(userId, id, body); return response({ ok: true }); }
    if (action === "places") {
      const trip = await repo.get(userId, id);
      await repo.reservePlaceLookup(userId);
      const env = portableEnv();
      const places = await Promise.all((trip.payload.placeIds as string[]).map(async (contentId, index) => {
        const common = await attemptProvider(fetchTourismData(env, "KorService2", "detailCommon2", { ...commonParams("1"), contentId }));
        const item = common.ok ? common.value.items[0] : null;
        return item ? placeFrom(item, {}, trip.payload.region, [], index) : null;
      }));
      return response({ places: places.filter(Boolean), missing: places.filter(place => !place).length, checkedAt: new Date().toISOString() });
    }
    if (action === "delete") { await repo.remove(userId, id, body.revision); return response({ ok: true }); }
    if (!action) return response(await repo.update(userId, id, body.revision, body.payload));
    return response({ error: "지원하지 않는 요청입니다." }, 404);
  } catch (error) {
    return error instanceof TravelError ? response({ error: error.message }, error.status) : response({ error: "여행을 저장하거나 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, 503);
  }
}
