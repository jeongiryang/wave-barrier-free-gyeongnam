import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as coordinates from "../lib/map-coordinates.js";
import * as trash from "../lib/trash-bin.js";
import * as budgets from "../lib/request-budget.js";

const code = ts.transpileModule(readFileSync(new URL("../server/tourism/trash-bin.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const place = { contentid: "1001", lDongRegnCd: "48", mapx: "128.691", mapy: "35.238" };
const bin = { 관리번호: "B1", 시도명: "경상남도", 설치주소: "경상남도 창원시 중앙대로", 세부위치: "정류장 옆", 위도: "35.2385", 경도: "128.6915", 데이터기준일자: "2026-04-15" };

function harness({ places = [place], bins = [bin], providerStatus = 200, invalidJson = false, partial = false, serviceKey = "encoded-test-key" } = {}) {
  const mod = { exports: {} }, calls = [], cached = new Map();
  new Function("module", "exports", "require", code)(mod, mod.exports, name => {
    if (name.endsWith("map-coordinates.js")) return coordinates;
    if (name.endsWith("trash-bin.js")) return trash;
    if (name.endsWith("request-budget.js")) return budgets;
    if (name.endsWith("/bounded-snapshot")) return { createBoundedSnapshotCache: () => ({ get: async (key, _ttl, _remaining, work) => { if (cached.has(key)) return cached.get(key); const value = await work(); if (value === null) return null; const result = { value, checkedAt: "2026-09-20T00:00:00.000Z" }; cached.set(key, result); return result; }, clear: () => cached.clear() }) };
    if (name.endsWith("/http")) return { clean: (value, limit = 200) => String(value ?? "").trim().slice(0, limit), json: (body, status = 200) => ({ body, status }) };
    if (name.endsWith("/provider-data")) return { commonParams: () => ({ numOfRows: "1" }), fetchTourismData: async (_env, service, operation, params) => { calls.push({ provider: "kto", service, operation, params }); return { items: places, partial }; }, attemptProvider: async promise => { try { return { ok: true, value: await promise }; } catch { return { ok: false }; } } };
    if (name.endsWith("provider-request.js")) return { requestProvider: async (_context, url) => { calls.push({ provider: "trash", url }); return { ok: providerStatus === 200, status: providerStatus, text: async () => invalidJson ? "<html>" : JSON.stringify({ response: { header: { resultCode: "00" }, body: { items: bins } } }) }; } };
    throw Error(name);
  });
  const env = { TOUR_API_SERVICE_KEY_ENCODED: serviceKey, WASTE_BIN_API_URL: "https://official.example.test/bins", WASTE_BIN_API_SOURCE: "경남 공식 가로휴지통" };
  return { calls, run: query => mod.exports.handleTrashBin(new URL(`https://wave.test/api/wave?${query}`), env) };
}

test("공개 contentId 외 좌표·반경·중복 쿼리를 거부한다", async () => {
  for (const query of ["action=trash-bin", "action=trash-bin&contentId=0", "action=trash-bin&contentId=1001&lat=35", "action=trash-bin&contentId=1001&radius=1000", "action=trash-bin&contentId=1001&contentId=1002"]) {
    const h = harness(), response = await h.run(query); assert.equal(response.status, 400); assert.equal(h.calls.length, 0);
  }
});

test("인코딩된 공공데이터 키를 이중 인코딩하지 않는다", async () => {
  const h = harness({ serviceKey: "test%2Bkey%2Fvalue%3D" });
  assert.equal((await h.run("action=trash-bin&contentId=1001")).status, 200);
  assert.equal(new URL(h.calls.find(call => call.provider === "trash").url).searchParams.get("serviceKey"), "test+key/value=");
});

test("KTO 경남 관광지와 공개 좌표를 다시 확인하고 상태를 구분한다", async () => {
  const success = harness(), available = await success.run("action=trash-bin&contentId=1001");
  assert.equal(available.body.status, "available");
  assert.equal(available.body.source, "경남 공식 가로휴지통");
  assert.equal(available.body.items.length, 1);
  assert.doesNotMatch(JSON.stringify(success.calls), /user|accuracy|currentLocation|radius/i);
  assert.equal((await harness({ bins: [] }).run("action=trash-bin&contentId=1001")).body.status, "empty");
  assert.equal((await harness({ places: [{ ...place, mapx: "" }] }).run("action=trash-bin&contentId=1001")).body.status, "location-unconfirmed");
  assert.equal((await harness({ places: [{ ...place, lDongRegnCd: "11" }] }).run("action=trash-bin&contentId=1001")).status, 400);
  assert.equal((await harness({ partial: true }).run("action=trash-bin&contentId=1001")).status, 502);
  assert.equal((await harness({ providerStatus: 503 }).run("action=trash-bin&contentId=1001")).status, 502);
  assert.equal((await harness({ invalidJson: true }).run("action=trash-bin&contentId=1001")).status, 502);
});
