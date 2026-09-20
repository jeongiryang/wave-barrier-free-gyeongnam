import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as facilities from "../lib/facility-layers.js";
import * as budgets from "../lib/request-budget.js";
import * as lowFloor from "../lib/transport/low-floor-bus.js";

const code = ts.transpileModule(readFileSync(new URL("../features/routing/useFacilityLayers.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function harness(responder) {
  const mod = { exports: {} }, calls = [];
  new Function("module", "exports", "require", code)(mod, mod.exports, name => {
    if (name === "react" || name === "./constants" || name === "./nearby-place-data") return {};
    if (name.endsWith("facility-layers.js")) return facilities;
    if (name.endsWith("request-budget.js")) return budgets;
    if (name.endsWith("low-floor-bus.js")) return lowFloor;
    if (name.endsWith("services/api")) return { optionalPlannerJson: async (url, options) => { calls.push({ url, options }); return responder(new URL(url, "https://wave.test"), options); } };
    throw Error(name);
  });
  return { calls, run: (id, contentId = "1001", controller = new AbortController()) => mod.exports.loadOfficialFacilityLayer({ id, label: id, source: "official" }, contentId, controller.signal) };
}
const item = { id: "1", name: "공공시설", kind: "쓰레기통", locationNote: "입구 옆", institutionName: "관리기관", referenceDate: "2026-09-01", availableHours: "09:00–18:00", usageNote: "안내데스크", distanceMeters: 10, destination: { latitude: 35.238, longitude: 128.691 } };
const response = { status: "available", contentId: "1001", kind: "no-smoking", checkedAt: "2026-09-20", source: "공공데이터", items: [item] };

test("세 시설 action과 응답 정보가 모두 연결되고 공개 ID만 요청한다", async () => {
  for (const [id, action] of [["trash-bin", "trash-bin"], ["no-smoking", "smoking-area"], ["sanitary-supply", "sanitary-supply"]]) {
    const h = harness(() => response), result = await h.run(id);
    assert.equal(result.state, "ready");
    assert.equal(result.markers[0].layerId, id);
    assert.equal(result.markers[0].referenceDate, item.referenceDate);
    const query = new URL(h.calls[0].url, "https://wave.test").searchParams;
    assert.deepEqual([...query], [["action", action], ["contentId", "1001"]]);
    assert.ok(h.calls[0].options.signal instanceof AbortSignal);
    if (id === "trash-bin") assert.equal(result.markers[0].address, "입구 옆");
    if (id === "sanitary-supply") assert.equal(result.markers[0].detail, "09:00–18:00 · 안내데스크");
  }
});

test("오류·다른 장소 응답·잘못된 좌표를 빈 결과로 처리하지 않는다", async () => {
  for (const payload of [null, { ...response, status: "provider-error", items: [] }, { ...response, contentId: "1002" }, { ...response, items: [null] }, { ...response, items: [{ ...item, destination: { latitude: NaN, longitude: 128 } }] }, { ...response, items: [] }]) {
    assert.equal((await harness(() => payload).run("trash-bin")).state, "error");
  }
  assert.equal((await harness(() => ({ ...response, status: "empty", items: [] })).run("trash-bin")).state, "empty");
  const h = harness(() => response);
  assert.equal((await h.run("trash-bin", "private-place")).state, "location-unconfirmed");
  const controller = new AbortController(); controller.abort();
  assert.equal((await h.run("trash-bin", "1001", controller)).state, "error");
  assert.equal(h.calls.length, 0);
});

const stops = [1, 2].map(n => ({ nodeId: `GN${n}`, cityCode: "38010", name: `정류장${n}`, point: { lat: 35.238, lng: 128.691 }, distance: n * 10 }));
const arrival = { id: "1001", status: "arrivals", routes: [{ routeName: "100", vehicles: [{ vehicle: "저상버스" }] }] };
test("저상버스 일부 정류장 실패는 확인된 마커를 유지하며 전체 실패는 오류다", async () => {
  const h = harness(url => !url.searchParams.has("nodeId") ? { id: "1001", status: "stops", stops } : url.searchParams.get("nodeId") === "GN1" ? arrival : null);
  const result = await h.run("low-floor-bus-arrival");
  assert.equal(result.state, "partial");
  assert.equal(result.markers.length, 1);
  assert.equal(h.calls.length, 3);
  assert.ok(h.calls.every(call => call.options.signal === h.calls[0].options.signal));
  const failed = harness(url => url.searchParams.has("nodeId") ? null : { id: "1001", status: "stops", stops });
  assert.equal((await failed.run("low-floor-bus-arrival")).state, "error");
});

test("저상버스 조회 중 취소하면 후속 정류장 요청과 오래된 결과를 반영하지 않는다", async () => {
  const controller = new AbortController();
  const h = harness(() => { controller.abort(); return { id: "1001", status: "stops", stops }; });
  assert.equal((await h.run("low-floor-bus-arrival", "1001", controller)).state, "error");
  assert.equal(h.calls.length, 1);
  const later = new AbortController();
  const aborted = harness(() => { later.abort(); return response; });
  assert.equal((await aborted.run("sanitary-supply", "1001", later)).state, "error");
});
