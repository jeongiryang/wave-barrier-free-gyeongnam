import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  clearFacilityLayer,
  emptyFacilitySelection,
  facilityDistanceMeters,
  failFacilityLayer,
  hiddenFacilityMarkerCount,
  mergeFacilityMarkers,
  toggleFacilityLayer,
  visibleFacilityMarkers,
} from "../lib/facility-layers.js";
import { FACILITY_LAYER_LIMIT, FACILITY_MARKER_CAP, facilityLayers, officialFacilityLayers, nearbyCategories } from "../features/routing/constants.ts";

const marker = (id, layerId, distanceMeters, overrides = {}) => ({
  id,
  layerId,
  name: `${layerId} ${id}`,
  address: "경남 창원시",
  destination: { latitude: 35.23, longitude: 128.68 },
  distanceMeters,
  source: "카카오 장소 검색",
  ...overrides,
});

test("toggleFacilityLayer keeps the multi-selection within the limit without turning anything off", () => {
  let active = [];
  for (const id of ["food", "cafe", "store", "pharmacy"]) active = toggleFacilityLayer(active, id, FACILITY_LAYER_LIMIT);
  assert.deepEqual(active, ["food", "cafe", "store", "pharmacy"]);

  const blocked = toggleFacilityLayer(active, "hospital", FACILITY_LAYER_LIMIT);
  // 상한에 막히면 켜진 레이어를 임의로 끄지 않고 같은 배열을 그대로 돌려준다.
  assert.equal(blocked, active);
  assert.deepEqual(blocked, ["food", "cafe", "store", "pharmacy"]);
});

test("toggleFacilityLayer turns a layer off when the same id is chosen again", () => {
  const active = toggleFacilityLayer(toggleFacilityLayer([], "food", FACILITY_LAYER_LIMIT), "cafe", FACILITY_LAYER_LIMIT);
  assert.deepEqual(toggleFacilityLayer(active, "food", FACILITY_LAYER_LIMIT), ["cafe"]);
});

test("one layer failing never erases another layer's results", () => {
  let selection = { ...emptyFacilitySelection(), active: ["food", "cafe"] };
  selection = mergeFacilityMarkers(selection, "food", [marker("f1", "food", 120), marker("f2", "food", 300)]);
  selection = mergeFacilityMarkers(selection, "cafe", [marker("c1", "cafe", 80)]);
  selection = failFacilityLayer(selection, "cafe");

  assert.deepEqual(selection.failed, ["cafe"]);
  assert.equal(selection.markers.food.length, 2, "실패한 레이어가 성공한 레이어의 마커를 지우면 안 된다");
  assert.equal(selection.markers.cafe, undefined);
  assert.deepEqual(visibleFacilityMarkers(selection, FACILITY_MARKER_CAP).map((item) => item.id), ["f1", "f2"]);

  // 실패한 레이어를 다시 받아오면 실패 표시만 사라지고 다른 레이어는 그대로다.
  selection = mergeFacilityMarkers(selection, "cafe", [marker("c1", "cafe", 80)]);
  assert.deepEqual(selection.failed, []);
  assert.equal(selection.markers.food.length, 2);
});

test("turning one layer off leaves the other layers untouched", () => {
  let selection = { ...emptyFacilitySelection(), active: ["food", "cafe"] };
  selection = mergeFacilityMarkers(selection, "food", [marker("f1", "food", 120)]);
  selection = mergeFacilityMarkers(selection, "cafe", [marker("c1", "cafe", 80)]);
  selection = clearFacilityLayer(selection, "food");

  assert.deepEqual(selection.active, ["cafe"]);
  assert.equal(selection.markers.food, undefined);
  assert.equal(selection.markers.cafe.length, 1);
});

test("visibleFacilityMarkers keeps the cap and cuts by distance", () => {
  let selection = { ...emptyFacilitySelection(), active: ["food"] };
  const many = Array.from({ length: 80 }, (_, index) => marker(`f${index}`, "food", (80 - index) * 10));
  selection = mergeFacilityMarkers(selection, "food", many);

  const visible = visibleFacilityMarkers(selection, FACILITY_MARKER_CAP);
  assert.equal(visible.length, FACILITY_MARKER_CAP);
  assert.equal(visible[0].distanceMeters, 10, "가장 가까운 곳이 먼저 온다");
  for (let index = 1; index < visible.length; index++) {
    assert.ok(visible[index - 1].distanceMeters <= visible[index].distanceMeters, "거리 오름차순이어야 한다");
  }
  assert.equal(hiddenFacilityMarkerCount(selection, FACILITY_MARKER_CAP), 20);
});

test("markers without a distance sort after the ones that have it", () => {
  let selection = { ...emptyFacilitySelection(), active: ["food"] };
  selection = mergeFacilityMarkers(selection, "food", [marker("a", "food", null), marker("b", "food", 500)]);
  assert.deepEqual(visibleFacilityMarkers(selection, 10).map((item) => item.id), ["b", "a"]);
});

test("duplicate facility ids are removed inside a layer and across layers", () => {
  let selection = { ...emptyFacilitySelection(), active: ["food", "cafe"] };
  selection = mergeFacilityMarkers(selection, "food", [marker("same", "food", 100), marker("same", "food", 100), marker("f2", "food", 200)]);
  assert.equal(selection.markers.food.length, 2, "같은 레이어 안의 중복 id는 하나만 남는다");

  selection = mergeFacilityMarkers(selection, "cafe", [marker("same", "cafe", 100)]);
  const visible = visibleFacilityMarkers(selection, FACILITY_MARKER_CAP);
  assert.equal(visible.filter((item) => item.id === "same").length, 1, "레이어가 달라도 같은 시설은 한 번만 그린다");
  assert.equal(visible.find((item) => item.id === "same").layerId, "food", "먼저 켠 레이어의 것이 남는다");
});

test("markers without usable coordinates are dropped", () => {
  const selection = mergeFacilityMarkers({ ...emptyFacilitySelection(), active: ["food"] }, "food", [
    marker("ok", "food", 100),
    { ...marker("bad", "food", 100), destination: { latitude: Number.NaN, longitude: 128.68 } },
    { ...marker("", "food", 100) },
  ]);
  assert.deepEqual(selection.markers.food.map((item) => item.id), ["ok"]);
});

test("only markers of active layers are drawn", () => {
  let selection = { ...emptyFacilitySelection(), active: ["food"] };
  selection = mergeFacilityMarkers(selection, "food", [marker("f1", "food", 10)]);
  selection = mergeFacilityMarkers(selection, "cafe", [marker("c1", "cafe", 5)]);
  assert.deepEqual(visibleFacilityMarkers(selection, FACILITY_MARKER_CAP).map((item) => item.id), ["f1"]);
});

test("facilityDistanceMeters measures between two public coordinates only", () => {
  const measured = facilityDistanceMeters({ latitude: 35.23, longitude: 128.68 }, { latitude: 35.24, longitude: 128.68 });
  assert.ok(measured > 1050 && measured < 1170, `약 1.1km 여야 한다: ${measured}`);
  assert.equal(facilityDistanceMeters({ latitude: 35.23, longitude: 128.68 }, { latitude: Number.NaN, longitude: 1 }), null);
});

test("the pure module never reaches for the network, storage or location", () => {
  const source = readFileSync(new URL("../lib/facility-layers.js", import.meta.url), "utf8");
  for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "indexedDB", "navigator", "geolocation", "document", "window"]) {
    assert.ok(!source.includes(forbidden), `lib/facility-layers.js 가 ${forbidden} 를 참조하면 안 된다`);
  }
});

test("place-search layers reuse the existing nearbyCategories codes", () => {
  const codes = new Map(nearbyCategories.map((item) => [item.id, item.code]));
  const searchLayers = facilityLayers.filter((layer) => layer.source === "place-search");
  assert.equal(searchLayers.length, 6);
  for (const layer of searchLayers) {
    assert.equal(layer.code, codes.get(layer.id), `${layer.id} 는 nearbyCategories 의 코드를 그대로 써야 한다`);
  }
});

test("official layers retain public provider adapters", () => {
  assert.deepEqual(officialFacilityLayers.map(layer => layer.id), ["low-floor-bus-arrival", "sanitary-supply", "no-smoking"]);
});

test("every layer carries a non-colour cue and a unique id", () => {
  const ids = new Set();
  for (const layer of facilityLayers) {
    assert.ok(layer.glyph && layer.glyph.length <= 2, `${layer.id} 에 글자 표시가 있어야 한다`);
    assert.ok(layer.label, `${layer.id} 에 화면 문구가 있어야 한다`);
    assert.ok(!ids.has(layer.id), `${layer.id} 가 중복됐다`);
    ids.add(layer.id);
  }
});
