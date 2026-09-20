import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as coordinates from "../lib/map-coordinates.js";
import * as sanitary from "../lib/sanitary-supply.js";
import * as budgets from "../lib/request-budget.js";

const code = ts.transpileModule(readFileSync(new URL("../server/tourism/sanitary-supply.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const place = { contentid: "1001", lDongRegnCd: "48", mapx: "128.691", mapy: "35.238" };
function harness({ places = [place], payload = [], partial = false, providerStatus = 200 } = {}) {
  const mod = { exports: {} }, calls = [];
  new Function("module", "exports", "require", code)(mod, mod.exports, name => {
    if (name.endsWith("map-coordinates.js")) return coordinates;
    if (name.endsWith("sanitary-supply.js")) return sanitary;
    if (name.endsWith("request-budget.js")) return budgets;
    if (name.endsWith("/bounded-snapshot")) return { createBoundedSnapshotCache: () => ({ get: async (_key, _ttl, _remaining, work) => { const value = await work(); return value === null ? null : { value, checkedAt: "2026-09-20" }; }, clear() {} }) };
    if (name.endsWith("/http")) return { json: (body, status = 200) => ({ body, status }) };
    if (name.endsWith("/provider-data")) return { commonParams: () => ({ numOfRows: "1" }), fetchTourismData: async (_env, _service, _operation, params) => { calls.push({ provider: "kto", params }); return { items: places, partial }; }, attemptProvider: async promise => { try { return { ok: true, value: await promise }; } catch { return { ok: false }; } } };
    if (name.endsWith("provider-request.js")) return { requestProvider: async (_context, url) => { calls.push({ provider: "sanitary", url }); return { ok: providerStatus === 200, status: providerStatus, text: async () => JSON.stringify(payload) }; } };
    throw Error(name);
  });
  const env = { TOUR_API_SERVICE_KEY_ENCODED: "test%2Bkey%2Fvalue%3D", SANITARY_SUPPLY_API_URL: "https://official.example.test/supply?serviceKey=old&pageNo=9" };
  return { calls, run: (query = "action=sanitary-supply&contentId=1001") => mod.exports.handleSanitarySupply(new URL(`https://wave.test/api/wave?${query}`), env) };
}

test("공개 경남 관광지의 위치만 조회하고 미확인 좌표와 잘못된 ID를 구별한다", async () => {
  for (const query of ["action=sanitary-supply", "action=sanitary-supply&contentId=1001&lat=35", "action=sanitary-supply&contentId=1001&contentId=1002"]) {
    const h = harness(); assert.equal((await h.run(query)).status, 400); assert.equal(h.calls.length, 0);
  }
  assert.equal((await harness({ places: [] }).run()).body.status, "invalid-request");
  assert.equal((await harness({ places: [{ ...place, lDongRegnCd: "11" }] }).run()).status, 400);
  assert.equal((await harness({ places: [{ ...place, mapx: "" }] }).run()).body.status, "location-unconfirmed");
  assert.equal((await harness({ partial: true }).run()).body.status, "provider-error");
});

test("정상 빈 목록만 empty이고 제공처 계약 오류는 provider-error다", async () => {
  assert.equal((await harness().run()).body.status, "empty");
  for (const payload of [null, {}, { error: "인증 오류" }, { response: { body: {} } }, [null], { response: { header: { resultCode: "99" }, body: { items: [] } } }]) {
    const result = await harness({ payload }).run();
    assert.equal(result.status, 502); assert.equal(result.body.status, "provider-error");
  }
  assert.equal((await harness({ providerStatus: 503 }).run()).status, 502);
});

test("공공데이터 키는 한 번만 인코딩하고 기존 URL 쿼리는 중복하지 않는다", async () => {
  const h = harness(); await h.run();
  const url = new URL(h.calls.find(call => call.provider === "sanitary").url);
  assert.deepEqual(url.searchParams.getAll("serviceKey"), ["test+key/value="]);
  assert.deepEqual(url.searchParams.getAll("pageNo"), ["1"]);
  assert.doesNotMatch(url.search, /lat=|lng=|latitude|longitude|contentId/);
});
