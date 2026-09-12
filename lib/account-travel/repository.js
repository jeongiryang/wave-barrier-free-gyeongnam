import { sql } from "kysely";
import { accountTripPayload, inviteHash, newInviteToken, travelText, TravelError, validTravelId } from "./model.js";

function access(db, id, userId) {
  return db.selectFrom("wave_account_trips").selectAll().where("id", "=", id).where(eb => eb.or([
    eb("user_id", "=", userId),
    eb.exists(eb.selectFrom("wave_trip_members").select("trip_id").whereRef("trip_id", "=", "wave_account_trips.id").where("user_id", "=", userId)),
  ]));
}
function view(row, userId) { return { id: row.id, payload: JSON.parse(row.payload), revision: Number(row.revision), updatedAt: Number(row.updated_at), role: row.user_id === userId ? "owner" : "member" }; }

export function travelRepository(db, { now = Date.now } = {}) {
  async function budget(tx, userId, action = "write", max = 30) {
    const time = now();
    const row = await tx.insertInto("wave_travel_limits").values({ user_id: userId, action, window_start: time, count: 1 })
      .onConflict(oc => oc.columns(["user_id", "action"]).doUpdateSet({
        count: sql`CASE WHEN wave_travel_limits.window_start <= ${time - 60000} THEN 1 ELSE wave_travel_limits.count + 1 END`,
        window_start: sql`CASE WHEN wave_travel_limits.window_start <= ${time - 60000} THEN ${time} ELSE wave_travel_limits.window_start END`,
      })).returning("count").executeTakeFirst();
    if (Number(row.count) > max) throw new TravelError("요청이 많습니다. 1분 뒤 다시 시도해 주세요.", 429);
  }
  async function readable(tx, id, userId) {
    if (!validTravelId(id)) throw new TravelError("여행을 찾을 수 없습니다.", 404);
    const row = await access(tx, id, userId).executeTakeFirst();
    if (!row) throw new TravelError("여행을 찾을 수 없거나 참여 권한이 없습니다.", 404);
    return row;
  }
  async function locked(tx, id, userId) {
    await readable(tx, id, userId);
    // Serialize membership changes and votes against this trip. Recheck after lock.
    await tx.updateTable("wave_account_trips").set({ updated_at: sql`updated_at` }).where("id", "=", id).execute();
    return readable(tx, id, userId);
  }
  const owner = (row, userId) => { if (row.user_id !== userId) throw new TravelError("여행을 만든 사람만 변경할 수 있습니다.", 403); };
  return {
    async list(userId) {
      const rows = await db.selectFrom("wave_account_trips").selectAll().where(eb => eb.or([
        eb("user_id", "=", userId), eb.exists(eb.selectFrom("wave_trip_members").select("trip_id").whereRef("trip_id", "=", "wave_account_trips.id").where("user_id", "=", userId)),
      ])).orderBy("updated_at", "desc").limit(40).execute();
      return rows.map(row => view(row, userId));
    },
    async get(userId, id) {
      const row = await readable(db, id, userId);
      const [members, votes, comments] = await Promise.all([
        db.selectFrom("wave_trip_members").select(["user_id as userId", "name"]).where("trip_id", "=", id).orderBy("joined_at").limit(10).execute(),
        db.selectFrom("wave_trip_votes").select(["user_id as userId", "place_id as placeId"]).where("trip_id", "=", id).limit(120).execute(),
        db.selectFrom("wave_trip_comments").select(["id", "user_id as userId", "name", "content", "created_at as createdAt"]).where("trip_id", "=", id).orderBy("created_at", "desc").limit(100).execute(),
      ]);
      return { ...view(row, userId), members, votes, comments, invitationActive: Boolean(row.invite_hash && Number(row.invite_expires) > now()) };
    },
    async create(userId, id, input) {
      if (!validTravelId(id)) throw new TravelError("여행 저장 번호를 확인해 주세요.");
      const payload = accountTripPayload(input);
      return db.transaction().execute(async tx => {
        await budget(tx, userId);
        const old = await tx.selectFrom("wave_account_trips").selectAll().where("id", "=", id).executeTakeFirst();
        if (old) {
          if (old.user_id !== userId || JSON.stringify(accountTripPayload(JSON.parse(old.payload))) !== JSON.stringify(payload)) throw new TravelError("저장 내용이 달라졌습니다. 새 여행으로 저장해 주세요.", 409);
          return view(old, userId); // Idempotent retry after a lost response.
        }
        const count = await tx.selectFrom("wave_account_trips").select(eb => eb.fn.countAll().as("n")).where("user_id", "=", userId).executeTakeFirst();
        if (Number(count.n) >= 20) throw new TravelError("계정에는 여행을 20개까지 보관할 수 있습니다.", 409);
        const time = now();
        const row = await tx.insertInto("wave_account_trips").values({ id, user_id: userId, payload: JSON.stringify(payload), revision: 1, created_at: time, updated_at: time, invite_expires: 0 }).returningAll().executeTakeFirst();
        return view(row, userId);
      });
    },
    async update(userId, id, revision, input) {
      const payload = accountTripPayload(input);
      return db.transaction().execute(async tx => {
        await budget(tx, userId);
        const row = await locked(tx, id, userId); owner(row, userId);
        if (Number(row.revision) !== revision) throw new TravelError("다른 화면에서 수정한 여행이 있습니다. 최신 내용을 확인하거나 내 수정본을 새 여행으로 저장해 주세요.", 409);
        const changed = await tx.updateTable("wave_account_trips").set({ payload: JSON.stringify(payload), revision: revision + 1, updated_at: now() }).where("id", "=", id).where("revision", "=", revision).returningAll().executeTakeFirst();
        if (!changed) throw new TravelError("여행이 변경되었습니다. 최신 내용을 확인해 주세요.", 409);
        await tx.deleteFrom("wave_trip_votes").where("trip_id", "=", id).where("place_id", "not in", payload.placeIds).execute();
        return view(changed, userId);
      });
    },
    async remove(userId, id, revision) {
      return db.transaction().execute(async tx => {
        await budget(tx, userId); const row = await locked(tx, id, userId); owner(row, userId);
        if (Number(row.revision) !== revision) throw new TravelError("여행이 변경되었습니다. 최신 내용을 확인한 뒤 삭제해 주세요.", 409);
        await tx.deleteFrom("wave_account_trips").where("id", "=", id).execute();
      });
    },
    async invitation(userId, id, enabled) {
      return db.transaction().execute(async tx => {
        await budget(tx, userId); const row = await locked(tx, id, userId); owner(row, userId);
        const token = enabled ? newInviteToken() : null;
        await tx.updateTable("wave_account_trips").set({ invite_hash: token ? await inviteHash(token) : null, invite_expires: token ? now() + 7 * 86400000 : 0 }).where("id", "=", id).execute();
        return token;
      });
    },
    async join(userId, id, token, name) {
      const hash = await inviteHash(token), label = travelText(name, 30);
      if (!label) throw new TravelError("동행자에게 표시할 이름을 입력해 주세요.");
      if (!validTravelId(id)) throw new TravelError("초대 링크를 확인해 주세요.", 404);
      return db.transaction().execute(async tx => {
        await budget(tx, userId, "join", 5);
        await tx.updateTable("wave_account_trips").set({ updated_at: sql`updated_at` }).where("id", "=", id).where("invite_hash", "=", hash).where("invite_expires", ">", now()).execute();
        const row = await tx.selectFrom("wave_account_trips").selectAll().where("id", "=", id).where("invite_hash", "=", hash).where("invite_expires", ">", now()).executeTakeFirst();
        if (!row) throw new TravelError("초대가 만료되었거나 취소됐습니다. 새 초대 링크를 받아 주세요.", 404);
        if (row.user_id === userId) return view(row, userId);
        const current = await tx.selectFrom("wave_trip_members").select("user_id").where("trip_id", "=", id).execute();
        if (!current.some(member => member.user_id === userId)) {
          if (current.length >= 9) throw new TravelError("한 여행은 만든 사람을 포함해 10명까지 함께할 수 있습니다.", 409);
          const joined = await tx.selectFrom("wave_trip_members").select(eb => eb.fn.countAll().as("n")).where("user_id", "=", userId).executeTakeFirst();
          if (Number(joined.n) >= 20) throw new TravelError("함께하는 여행은 20개까지 참여할 수 있습니다.", 409);
          await tx.insertInto("wave_trip_members").values({ trip_id: id, user_id: userId, name: label, joined_at: now() }).execute();
        }
        return view(row, userId);
      });
    },
    async participate(userId, id, body) {
      return db.transaction().execute(async tx => {
        await budget(tx, userId); const row = await locked(tx, id, userId);
        const member = await tx.selectFrom("wave_trip_members").select("name").where("trip_id", "=", id).where("user_id", "=", userId).executeTakeFirst();
        if (body.action === "vote") {
          if (!JSON.parse(row.payload).placeIds.includes(body.placeId) || typeof body.selected !== "boolean") throw new TravelError("투표할 장소를 확인해 주세요.");
          if (body.selected) await tx.insertInto("wave_trip_votes").values({ trip_id: id, user_id: userId, place_id: body.placeId }).onConflict(oc => oc.columns(["trip_id", "user_id", "place_id"]).doNothing()).execute();
          else await tx.deleteFrom("wave_trip_votes").where("trip_id", "=", id).where("user_id", "=", userId).where("place_id", "=", body.placeId).execute();
        } else if (body.action === "comment") {
          const content = travelText(body.content, 500); if (!content) throw new TravelError("의견을 입력해 주세요.");
          const count = await tx.selectFrom("wave_trip_comments").select(eb => eb.fn.countAll().as("n")).where("trip_id", "=", id).executeTakeFirst();
          if (Number(count.n) >= 100) throw new TravelError("의견은 여행당 100개까지 남길 수 있습니다.", 409);
          await tx.insertInto("wave_trip_comments").values({ id: crypto.randomUUID(), trip_id: id, user_id: userId, name: member?.name || "여행 만든 사람", content, created_at: now() }).execute();
        } else if (body.action === "delete-comment") {
          const query = tx.deleteFrom("wave_trip_comments").where("trip_id", "=", id).where("id", "=", String(body.commentId));
          await (row.user_id === userId ? query : query.where("user_id", "=", userId)).execute();
        } else if (body.action === "remove-member") {
          const target = String(body.userId || "");
          if (target !== userId) owner(row, userId);
          if (target === row.user_id) throw new TravelError("여행을 만든 사람은 참여를 취소할 수 없습니다.");
          await tx.deleteFrom("wave_trip_votes").where("trip_id", "=", id).where("user_id", "=", target).execute();
          await tx.deleteFrom("wave_trip_comments").where("trip_id", "=", id).where("user_id", "=", target).execute();
          await tx.deleteFrom("wave_trip_members").where("trip_id", "=", id).where("user_id", "=", target).execute();
          if (target !== userId) await tx.updateTable("wave_account_trips").set({ invite_hash: null, invite_expires: 0 }).where("id", "=", id).execute();
        } else throw new TravelError("지원하지 않는 여행 작업입니다.");
      });
    },
    async preferences(userId) {
      const row = await db.selectFrom("wave_travel_preferences").selectAll().where("user_id", "=", userId).executeTakeFirst();
      return row ? { selectedIds: JSON.parse(row.selected_ids), revision: Number(row.revision) } : { selectedIds: [], revision: 0 };
    },
    async savePreferences(userId, selectedIds, revision) {
      return db.transaction().execute(async tx => {
        await budget(tx, userId);
        const old = await tx.selectFrom("wave_travel_preferences").selectAll().where("user_id", "=", userId).executeTakeFirst();
        if (Number(old?.revision || 0) !== revision) throw new TravelError("다른 화면에서 편의 조건을 바꿨습니다. 다시 불러온 뒤 저장해 주세요.", 409);
        const values = { selected_ids: JSON.stringify(selectedIds), revision: revision + 1, updated_at: now() };
        await tx.insertInto("wave_travel_preferences").values({ user_id: userId, ...values }).onConflict(oc => oc.column("user_id").doUpdateSet(values)).execute();
        return { selectedIds, revision: revision + 1 };
      });
    },
    async reservePlaceLookup(userId) { await db.transaction().execute(tx => budget(tx, userId, "places", 3)); },
    async reserveKakaoSend(userId, id) {
      await db.transaction().execute(async tx => {
        await budget(tx, userId, "kakao-message", 3);
        await budget(tx, userId, `kakao-message:${id}`, 1);
      });
    },
  };
}
