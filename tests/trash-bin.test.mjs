import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTrashBinRecord, rankTrashBins, trashBinDistanceMeters } from "../lib/trash-bin.js";
import { visibleFacilityMarkers } from "../lib/facility-layers.js";

const point = { latitude: 35.238, longitude: 128.691 };
const record = { 관리번호: "B1", 시도명: "경상남도", 설치주소: "경상남도 창원시 중앙대로", 세부위치: "버스정류장 옆", 쓰레기통형태: "일반·재활용", 위도: "35.2385", 경도: "128.6915", 데이터기준일자: "2026-04-15" };

test("좌표와 기준일이 있는 경남 공식 레코드만 정규화한다", () => {
  const item = normalizeTrashBinRecord(record, point);
  assert.equal(item.id, "B1");
  assert.equal(item.kind, "일반·재활용");
  assert.match(item.locationNote, /버스정류장 옆/);
  for (const patch of [{ 위도: "" }, { 경도: "" }, { 데이터기준일자: "" }, { 시도명: "부산광역시", 설치주소: "부산광역시 중구", 세부위치: "중앙로" }]) {
    assert.equal(normalizeTrashBinRecord({ ...record, ...patch }, point), null);
  }
});

test("직선거리 순으로 중복 제거한 최대 15개만 반환한다", () => {
  const records = Array.from({ length: 18 }, (_, index) => ({ ...record, 관리번호: `B${index}`, 설치주소: `경상남도 창원시 ${index}길`, 위도: String(point.latitude + (18 - index) * .001) }));
  records.push({ ...records[17], 관리번호: "중복" });
  const items = rankTrashBins(records, point);
  assert.equal(items.length, 15);
  assert.ok(items.every((item, index) => index === 0 || items[index - 1].distanceMeters <= item.distanceMeters));
  assert.ok(trashBinDistanceMeters(point, items[0].destination) < trashBinDistanceMeters(point, items.at(-1).destination));
  assert.doesNotMatch(JSON.stringify(items), /user|accuracy|current|사용자/i);
});

test("전체 마커 상한은 쓰레기통을 먼저 줄여 기존 레이어를 보존한다", () => {
  const marker = (layerId, index, distanceMeters) => ({ id: `${layerId}-${index}`, layerId, name: "시설", address: "", destination: { latitude: 35, longitude: 128 }, distanceMeters, source: "공공데이터" });
  const selection = {
    active: ["trash-bin", "food"], failed: [],
    markers: {
      "trash-bin": Array.from({ length: 15 }, (_, index) => marker("trash-bin", index, index)),
      food: Array.from({ length: 55 }, (_, index) => marker("food", index, 1000 + index)),
    },
  };
  const visible = visibleFacilityMarkers(selection, 60);
  assert.equal(visible.filter(item => item.layerId === "food").length, 55);
  assert.equal(visible.filter(item => item.layerId === "trash-bin").length, 5);
});
