import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeSavedPlaceCatalog,
  resolveSavedPlaces,
  sanitizeSavedPlaceSnapshot,
} from "../lib/saved-place-catalog.js";

const changwon = {
  id: "changwon-1", name: "창원 미술관", city: "창원", address: "경상남도 창원시",
  image: "https://wave.test/changwon.jpg", score: 88, knownFields: 4, source: "공식 관광정보",
  mapX: "128.6", mapY: "35.2", summary: "원본 설명", details: ["원본 세부정보"],
};
const jinju = {
  id: "jinju-1", name: "진주 수목원", city: "진주", address: "경상남도 진주시",
  image: "https://wave.test/jinju.jpg", score: 75, knownFields: 3, source: "공식 관광정보",
  mapX: "128.1", mapY: "35.1",
};

test("saved place snapshots preserve public destination coordinates but omit raw details and device position", () => {
  const snapshot = sanitizeSavedPlaceSnapshot(changwon);
  assert.deepEqual(Object.keys(snapshot).sort(), ["address", "city", "id", "image", "knownFields", "mapX", "mapY", "name", "score", "source"]);
  assert.equal(snapshot.mapX, "128.6");
  assert.equal(snapshot.mapY, "35.2");
  assert.equal("origin" in sanitizeSavedPlaceSnapshot({ ...changwon, origin: { lat: 35.1, lng: 128.1 } }), false);
  assert.equal("details" in snapshot, false);
  assert.equal("summary" in snapshot, false);
});

test("saved places from previous regions remain ordered after active results switch regions", () => {
  const catalog = mergeSavedPlaceCatalog([], [changwon, jinju]);
  const resolved = resolveSavedPlaces(["changwon-1", "jinju-1"], [jinju], catalog);
  assert.deepEqual(resolved.map((place) => `${place.city}:${place.name}`), ["창원:창원 미술관", "진주:진주 수목원"]);
  assert.equal(resolved[0].mapX, "128.6");
  assert.equal(resolved[1].mapX, "128.1");
});
