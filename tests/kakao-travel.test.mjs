import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { publicTravelBody, travelCard, privateTravelMessage, sendKakaoMemo, KakaoMessageError, WAVE_ORIGIN, KAKAO_T_URL } from "../lib/kakao-travel.js";
import { TravelError } from "../lib/account-travel/model.js";
import { verifySameOriginMutation } from "../lib/security/request-boundaries.js";
const id = "12345678-1234-4123-8123-123456789012";
const trip = { title: "통영 여행", region: "통영", travelStart: "2026-09-20", travelEnd: "2026-09-21", dayStartTime: "10:00", themes: ["nature"], placeIds: ["1001"], scheduleAssignments: { "1001": "2026-09-20" }, note: "PRIVATE", profiles: ["wheelchair"], origin: { latitude: 35 } };
test("public Kakao cards exclude private preferences, notes and location and reject foreign links", () => {
  const body = publicTravelBody(trip);
  assert.deepEqual(body.selections.profiles, []); assert.deepEqual(body.origin, { label: "" });
  assert.doesNotMatch(JSON.stringify(body), /PRIVATE|wheelchair|latitude/);
  const card = travelCard(trip, `${WAVE_ORIGIN}/trip/abcdef123456`);
  assert.equal(card.content.description, "2026-09-20 — 2026-09-21 · 여행지 1곳");
  for (const url of ["https://evil.example/trip/abcdef123456", `${WAVE_ORIGIN}/trip/abcdef123456?secret=x`, `${WAVE_ORIGIN}/my-trips/${id}`]) assert.throws(() => travelCard(trip, url));
  assert.equal(privateTravelMessage(trip, id).buttons[0].link.web_url, `${WAVE_ORIGIN}/my-trips/${id}`);
  assert.equal(new URL(KAKAO_T_URL).hostname, "service.kakaomobility.com"); assert.doesNotMatch(KAKAO_T_URL, /dest|latitude|longitude|booking/);
});
test("memo uses only self-chat endpoint; provider rejection and uncertain sends never become success or retry", async () => {
  let calls = 0;
  const request = async (url, init) => { calls++; assert.equal(url, "https://kapi.kakao.com/v2/api/talk/memo/default/send"); assert.equal(init.headers.Authorization, "Bearer fixture-token"); assert.equal(init.body.has("receiver_uuids"), false); assert.equal(JSON.parse(init.body.get("template_object")).object_type, "feed"); return Response.json({ result_code: 0 }); };
  await sendKakaoMemo("fixture-token", privateTravelMessage(trip, id), request); assert.equal(calls, 1);
  await assert.rejects(() => sendKakaoMemo("fixture-token", {}, async () => Response.json({ code: -402, msg: "secret" }, { status: 403 })), e => e.code === "CONSENT_REQUIRED" && !e.message.includes("secret"));
  await assert.rejects(() => sendKakaoMemo("fixture-token", {}, async () => Response.json({ code: -10 }, { status: 429 })), e => e.status === 429);
  let timeouts = 0;
  await assert.rejects(() => sendKakaoMemo("fixture-token", {}, async () => { timeouts++; throw new Error("secret"); }), /나와의 채팅을 먼저 확인/); assert.equal(timeouts, 1);
  await assert.rejects(() => sendKakaoMemo("fixture-token", {}, async () => Response.json({ result_code: 99 })), /보내지 못했습니다/);
});
function compile(path, dependencies) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: name => { if (!dependencies[name]) throw new Error(`Unexpected import ${name}`); return dependencies[name]; }, Response, Request, URL, TextEncoder }); return exports;
}
const boundaries = compile("../lib/server-request.ts", { "./security/request-boundaries.js": { verifySameOriginMutation } });
function fixture({ user = "owner", allowed = true, scope = "account_email,talk_message", limited = false } = {}) {
  const calls = [];
  const repo = { get: async (userId, tripId) => { calls.push("read"); assert.equal(userId, "owner"); if (!allowed) throw new TravelError("missing", 404); assert.equal(tripId, id); return { id, payload: trip }; }, reserveKakaoSend: async () => { calls.push("budget"); if (limited) throw new TravelError("limit", 429); } };
  const auth = { $context: Promise.resolve({ internalAdapter: { findAccounts: async userId => { assert.equal(userId, "owner"); return [{ providerId: "kakao", accountId: "provider-owner", scope }]; } } }), api: { getAccessToken: async input => { assert.equal(input.body.accountId, "provider-owner"); return { accessToken: "server-secret" }; } } };
  const loaded = compile("../server/trips/kakao-message-handler.ts", {
    "next/headers": { headers: async () => new Headers() }, "../../features/community/server/session": { requiredCommunityUser: async () => ({ user: user ? { id: user } : null }) }, "../../lib/auth/native-runtime": { readyNativeAuth: async () => auth }, "../../lib/server-request": boundaries,
    "../../lib/account-travel/database.js": { accountTravelRepository: () => repo }, "../../lib/account-travel/model.js": { TravelError }, "../../lib/kakao-travel.js": { KakaoMessageError, privateTravelMessage, sendKakaoMemo: async () => { calls.push("send"); } },
  });
  return { handler: loaded.kakaoMessageHandler, calls };
}
const request = (body = { tripId: id, userId: "victim" }, origin = WAVE_ORIGIN) => new Request(`${WAVE_ORIGIN}/api/kakao/message`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
test("message endpoint binds the session, private trip, consent and budget before sending", async () => {
  for (const [options, status] of [[{ user: "" }, 401], [{ allowed: false }, 404], [{ scope: "account_email" }, 403], [{ limited: true }, 429]]) {
    const f = fixture(options); const result = await f.handler(request()); assert.equal(result.status, status); assert.equal(f.calls.includes("send"), false); assert.match(result.headers.get("cache-control"), /private, no-store/);
  }
  const f = fixture(); assert.equal((await f.handler(request({}, "https://evil.example"))).status, 403); assert.deepEqual(f.calls, []);
  assert.equal((await f.handler(request({ value: "x".repeat(1025) }))).status, 413); assert.deepEqual(f.calls, []);
  const result = await f.handler(request()); assert.equal(result.status, 200); assert.deepEqual(f.calls, ["read", "budget", "send"]); assert.equal(await result.text(), '{"ok":true}');
});
