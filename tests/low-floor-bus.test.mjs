import test from "node:test";
import assert from "node:assert/strict";
import { isLowFloorVehicle, lowFloorArrivalMarkers } from "../lib/transport/low-floor-bus.js";

test("only an arrival explicitly labelled as a low-floor bus is confirmed", () => {
  assert.equal(isLowFloorVehicle("저상버스"), true);
  assert.equal(isLowFloorVehicle("초저상 버스"), true);
  assert.equal(isLowFloorVehicle("low-floor bus"), true);
  assert.equal(isLowFloorVehicle("일반버스"), false);
  assert.equal(isLowFloorVehicle(""), false);
});

test("markers keep stop, route, source and observation time without route-wide claims", () => {
  const markers = lowFloorArrivalMarkers([{ stop: { nodeId: "CW1", cityCode: "38010", name: "정문", point: { lat: 35.23, lng: 128.68 }, distance: 120 }, response: {
    arrivalCheckedAt: "2026-09-20T00:00:00.000Z",
    routes: [
      { routeName: "100", vehicles: [{ vehicle: "일반버스" }] },
      { routeName: "200", vehicles: [{ vehicle: "저상버스" }] },
    ],
  } }]);
  assert.equal(markers.length, 1);
  assert.equal(markers[0].name, "정문");
  assert.equal(markers[0].source, "국토교통부 TAGO 버스도착정보");
  assert.match(markers[0].detail, /200번/);
  assert.match(markers[0].detail, /상시 운행 여부.*다시 확인/);
});

test("unknown and ordinary vehicles stay unconfirmed instead of becoming absence", () => {
  const observations = [{ stop: { nodeId: "CW1", cityCode: "38010", name: "정문", point: { lat: 35.23, lng: 128.68 } }, response: { routes: [{ routeName: "100", vehicles: [{ vehicle: "" }, { vehicle: "일반버스" }] }] } }];
  assert.deepEqual(lowFloorArrivalMarkers(observations), []);
});
