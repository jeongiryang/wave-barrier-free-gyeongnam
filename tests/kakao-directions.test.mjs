import test from "node:test";
import assert from "node:assert/strict";
import { kakaoDirections } from "../lib/kakao-directions.js";

const origin = { lat: 35.2422, lng: 128.6982 };
const destination = { name: "미술관, / ?#", mapX: "128.691", mapY: "35.238" };
const options = { origin, originLabel: "공개 출발, / ?#", privateOrigin: false, destination, mode: "car" };

for (const [mode, external] of [["car", "car"], ["transit", "traffic"], ["walk", "walk"], ["bicycle", "bicycle"]]) {
  test(`${mode} preserves ordered public endpoints, safe names and the external mode`, () => {
    const result = kakaoDirections({ ...options, mode });
    assert.equal(result, `https://map.kakao.com/link/by/${external}/${encodeURIComponent(options.originLabel)},35.2422,128.6982/${encodeURIComponent(destination.name)},35.238,128.691`);
  });
}

test("private current location is omitted even if its coordinates and label are present", () => {
  const result = kakaoDirections({ ...options, privateOrigin: true });
  assert.equal(result, `https://map.kakao.com/link/to/${encodeURIComponent(destination.name)},35.238,128.691`);
  assert.ok(!result.includes("35.2422"));
});

for (const invalid of [null, { lat: 0, lng: 0 }, { lat: 35.6, lng: 139.7 }, { lat: NaN, lng: Infinity }]) {
  test(`invalid origin ${JSON.stringify(invalid)} cannot become a full journey`, () => {
    const result = kakaoDirections({ ...options, origin: invalid });
    assert.equal(result, `https://map.kakao.com/link/to/${encodeURIComponent(destination.name)},35.238,128.691`);
  });
}
for (const [mapX, mapY] of [["", ""], ["0", "0"], ["139.7", "35.6"], ["128.6", "Infinity"]]) {
  test(`invalid destination ${mapX},${mapY} uses only a place-name search`, () => {
    assert.equal(kakaoDirections({ ...options, destination: { ...destination, mapX, mapY } }), `https://map.kakao.com/link/search/${encodeURIComponent(destination.name)}`);
  });
}
test("an unknown mode cannot silently choose driving", () => {
  assert.equal(kakaoDirections({ ...options, mode: "unknown" }), `https://map.kakao.com/link/to/${encodeURIComponent(destination.name)},35.238,128.691`);
});
