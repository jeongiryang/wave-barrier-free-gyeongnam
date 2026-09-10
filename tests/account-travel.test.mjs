import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Kysely, SqliteDialect } from "kysely";
import test from "node:test";
import { travelRepository } from "../lib/account-travel/repository.js";
import { accountTripPayload, bookToAccountTrip } from "../lib/account-travel/model.js";

const payload = { title: "통영에서 함께", region: "통영", travelStart: "2026-09-20", travelEnd: "2026-09-21", dayStartTime: "10:00", themes: ["nature"], placeIds: ["123456", "654321"], scheduleAssignments: { "123456": "2026-09-20", "654321": "2026-09-21" }, note: "첫날 바닷가", status: "planned" };
test("Kakao send reservations survive another instance and stop same-trip duplicates before provider calls", async t => {
  const { repo, db, advance } = fixture(t);
  await repo.reserveKakaoSend("owner", "trip-a");
  await assert.rejects(() => travelRepository(db, { now: () => 1_800_000_000_000 }).reserveKakaoSend("owner", "trip-a"), error => error.status === 429);
  await repo.reserveKakaoSend("owner", "trip-b"); await repo.reserveKakaoSend("owner", "trip-c");
  await assert.rejects(() => repo.reserveKakaoSend("owner", "trip-d"), error => error.status === 429);
  advance(60001); await repo.reserveKakaoSend("owner", "trip-a");
});
function fixture(t) {
  const sqlite = new DatabaseSync(":memory:"); sqlite.exec("PRAGMA foreign_keys=ON");
  sqlite.exec(readFileSync(new URL("../migrations/011_account_travel.sql", import.meta.url), "utf8"));
  const database = { close: () => sqlite.close(), prepare: text => {
    const statement = sqlite.prepare(text);
    return { reader: statement.columns().length > 0, all: args => statement.all(...args), run: args => statement.run(...args), iterate: args => statement.iterate(...args) };
  } };
  const db = new Kysely({ dialect: new SqliteDialect({ database }) });
  t.after(() => db.destroy());
  let time = 1_800_000_000_000;
  return { db, sqlite, repo: travelRepository(db, { now: () => time }), advance: amount => { time += amount; } };
}
test("account trip storage has an explicit field allowlist and rejects corrupt dates/IDs", () => {
  const safe = accountTripPayload({ ...payload, latitude: 35, longitude: 128, email: "private@example.com", origin: { latitude: 35 }, profiles: ["wheelchair"], places: [{ summary: "Provider data" }], image: "private.jpg" });
  assert.deepEqual(Object.keys(safe).sort(), ["version", "title", "region", "travelStart", "travelEnd", "dayStartTime", "themes", "placeIds", "scheduleAssignments", "status", "note"].sort());
  for (const change of [{ region: "서울" }, { travelStart: "2026-02-30" }, { travelEnd: "2026-09-30" }, { placeIds: ["https://example.com"] }, { placeIds: ["123456", "123456"] }, { scheduleAssignments: { "123456": "2026-09-30" } }]) assert.throws(() => accountTripPayload({ ...payload, ...change }));
  const converted = bookToAccountTrip({ ...payload, places: [{ id: "123456", name: "API title", image: "photo", latitude: 35 }] });
  assert.deepEqual(converted.placeIds, ["123456"]); assert.equal(JSON.stringify(converted).includes("API title"), false);
});
test("private travel survives a second repository session; outsider cannot read/update/delete/invite", async t => {
  const { db, repo } = fixture(t); const id = randomUUID();
  await repo.create("owner", id, payload);
  assert.equal((await travelRepository(db).get("owner", id)).payload.title, payload.title);
  assert.deepEqual(await repo.list("stranger"), []);
  for (const action of [() => repo.get("stranger", id), () => repo.update("stranger", id, 1, payload), () => repo.remove("stranger", id, 1), () => repo.invitation("stranger", id, true)]) await assert.rejects(action, error => error.status === 404);
});
test("save retry is idempotent; stale concurrent edits retain both the current version and rejected draft", async t => {
  const { repo } = fixture(t); const id = randomUUID(); await repo.create("owner", id, payload); await repo.create("owner", id, payload);
  assert.equal((await repo.list("owner")).length, 1);
  const results = await Promise.allSettled([repo.update("owner", id, 1, { ...payload, title: "version A" }), repo.update("owner", id, 1, { ...payload, title: "version B" })]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  assert.equal(results.find(result => result.status === "rejected").reason.status, 409);
  assert.equal((await repo.get("owner", id)).revision, 2);
  await assert.rejects(() => repo.remove("owner", id, 1), error => error.status === 409);
});
test("hash-only invitation requires current valid token; rotation, expiry and revocation stop new members", async t => {
  const { repo, sqlite, advance } = fixture(t); const id = randomUUID(); await repo.create("owner", id, payload);
  const token = await repo.invitation("owner", id, true);
  assert.notEqual(sqlite.prepare("SELECT invite_hash FROM wave_account_trips").get().invite_hash, token);
  await repo.join("friend", id, token, "동행자"); assert.equal((await repo.get("friend", id)).role, "member");
  await assert.rejects(() => repo.invitation("friend", id, true), error => error.status === 403);
  await assert.rejects(() => repo.update("friend", id, 1, payload), error => error.status === 403);
  const next = await repo.invitation("owner", id, true);
  await assert.rejects(() => repo.join("second", id, token, "새 동행자"), error => error.status === 404);
  advance(7 * 86400000 + 1);
  await assert.rejects(() => repo.join("second", id, next, "새 동행자"), error => error.status === 404);
  await repo.invitation("owner", id, false);
  assert.equal((await repo.get("friend", id)).role, "member");
});
test("votes are idempotent and scoped; participation removal also removes votes/comments", async t => {
  const { repo, sqlite } = fixture(t); const id = randomUUID(); await repo.create("owner", id, payload);
  await repo.join("friend", id, await repo.invitation("owner", id, true), "동행자");
  await repo.participate("friend", id, { action: "vote", placeId: "123456", selected: true });
  await repo.participate("friend", id, { action: "vote", placeId: "123456", selected: true });
  await repo.participate("friend", id, { action: "comment", content: "첫날 여기에 가요" });
  assert.equal((await repo.get("owner", id)).votes.length, 1);
  await assert.rejects(() => repo.participate("friend", id, { action: "vote", placeId: "999999", selected: true }));
  await assert.rejects(() => repo.participate("friend", id, { action: "remove-member", userId: "owner" }), error => error.status === 403);
  await repo.participate("owner", id, { action: "remove-member", userId: "friend" });
  await assert.rejects(() => repo.get("friend", id), error => error.status === 404);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM wave_trip_votes").get().n, 0);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM wave_trip_comments").get().n, 0);
});
test("preferences are private, explicit and versioned; removing saved choices does not change others", async t => {
  const { repo } = fixture(t);
  assert.deepEqual(await repo.preferences("owner"), { selectedIds: [], revision: 0 });
  await repo.savePreferences("owner", ["wheelchair"], 0);
  assert.deepEqual(await repo.preferences("friend"), { selectedIds: [], revision: 0 });
  await assert.rejects(() => repo.savePreferences("owner", ["parking"], 0), error => error.status === 409);
  await repo.savePreferences("owner", [], 1);
  assert.deepEqual(await repo.preferences("owner"), { selectedIds: [], revision: 2 });
});
test("trip deletion cascades shared data; place lookup and writes have bounded database budgets", async t => {
  const { repo, sqlite } = fixture(t); const id = randomUUID(); await repo.create("owner", id, payload);
  await repo.join("friend", id, await repo.invitation("owner", id, true), "동행자");
  await repo.participate("friend", id, { action: "comment", content: "메모" }); await repo.remove("owner", id, 1);
  for (const table of ["wave_account_trips", "wave_trip_members", "wave_trip_comments"]) assert.equal(sqlite.prepare(`SELECT count(*) n FROM ${table}`).get().n, 0);
  for (let i = 0; i < 3; i++) await repo.reservePlaceLookup("owner");
  await assert.rejects(() => repo.reservePlaceLookup("owner"), error => error.status === 429);
});
