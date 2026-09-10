import test from "node:test";
import assert from "node:assert/strict";
import { constrainedGyeongnamViewport, GYEONGNAM_MAP_BOUNDS as bounds } from "../lib/gyeongnam-map-viewport.js";
import { GYEONGNAM_REGION_POINTS } from "../lib/gyeongnam-regions.js";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("all 18 regional centers remain navigable", () => {
  for (const point of Object.values(GYEONGNAM_REGION_POINTS)) {
    const result = constrainedGyeongnamViewport(point, { lat: point.lat - .01, lng: point.lng - .01 }, { lat: point.lat + .01, lng: point.lng + .01 });
    assert.equal(result.tooWide, false);
    assert.equal(result.lat, point.lat);
    assert.equal(result.lng, point.lng);
  }
});

test("pan in any direction preserves the whole viewport inside the travel envelope", () => {
  for (const point of [{ lat: 34.5, lng: 130.4 }, { lat: 35.6, lng: 121.4 }, { lat: 38, lng: 128.4 }, { lat: 30, lng: 128.4 }]) {
    const result = constrainedGyeongnamViewport(point, { lat: point.lat - .1, lng: point.lng - .2 }, { lat: point.lat + .1, lng: point.lng + .2 });
    assert.equal(result.tooWide, false);
    assert.ok(result.lat - .1 >= bounds.south - 1e-8 && result.lat + .1 <= bounds.north + 1e-8);
    assert.ok(result.lng - .2 >= bounds.west - 1e-8 && result.lng + .2 <= bounds.east + 1e-8);
  }
});

test("a viewport wider or taller than Gyeongnam requires zooming in", () => {
  for (const radius of [{ lat: 2, lng: .1 }, { lat: .1, lng: 3 }]) {
    assert.equal(constrainedGyeongnamViewport({ lat: 35, lng: 128 }, { lat: 35 - radius.lat, lng: 128 - radius.lng }, { lat: 35 + radius.lat, lng: 128 + radius.lng }).tooWide, true);
  }
});

test("the Kakao renderer constrains SDK pan/zoom events and ignores a replaced map", () => {
  const mod = { exports: {} };
  const code = ts.transpileModule(readFileSync(new URL("../features/routing/kakao-map-viewport.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("module", "exports", "require", code)(mod, mod.exports, () => ({ constrainedGyeongnamViewport }));
  class LatLng { constructor(lat, lng) { this.lat = lat; this.lng = lng; } getLat() { return this.lat; } getLng() { return this.lng; } }
  let listener, cancelled = false;
  const map = {
    level: 14, center: new LatLng(35, 132), max: 14,
    setMaxLevel(value) { this.max = value; this.level = Math.min(this.level, value); },
    getLevel() { return this.level; }, setLevel(value) { this.level = value; listener?.(); },
    getCenter() { return this.center; }, setCenter(value) { this.center = new LatLng(Math.round(value.lat / .0015) * .0015, Math.round(value.lng / .0015) * .0015); listener?.(); },
    getBounds() { const r = 2 ** (this.level - 9) * .4, shift = .03 * (this.center.lng - 128.6); return { getSouthWest: () => new LatLng(this.center.lat - r + shift, this.center.lng - r), getNorthEast: () => new LatLng(this.center.lat + r + shift, this.center.lng + r) }; },
  };
  const constrain = mod.exports.restrictKakaoViewport(map, { LatLng, event: { addListener(_map, event, callback) { assert.equal(event, "bounds_changed"); listener = callback; } } }, () => cancelled);
  constrain();
  assert.equal(map.max, 11);
  assert.ok(map.level < 11);
  assert.ok(map.getBounds().getNorthEast().getLng() <= bounds.east + 1e-8);
  map.setCenter(new LatLng(35, 121));
  assert.ok(map.getBounds().getSouthWest().getLng() >= bounds.west - 1e-8);
  assert.ok(map.getBounds().getSouthWest().getLat() >= bounds.south - 1e-8);
  cancelled = true;
  map.setCenter(new LatLng(35, 132));
  assert.equal(map.center.lng, 132);
});
