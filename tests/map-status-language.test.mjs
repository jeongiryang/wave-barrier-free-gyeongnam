import assert from "node:assert/strict";
import test from "node:test";
import { mapCrowdText, mapStatusText } from "../features/routing/map-status-copy.ts";

test("map notices keep unknown provider text and original place names intact", () => {
  for (const text of ["", "외부 제공처의 별도 안내", "constructor", "__proto__", "<script>example</script>"]) {
    assert.equal(mapStatusText(text, true), text);
    assert.equal(mapStatusText(text, false), text);
  }
  assert.equal(mapStatusText("창원 공원을 출발지로 설정했습니다.", true), "Departure set to 창원 공원.");
  assert.equal(mapStatusText("A & B을 목적지로 설정했습니다.", true), "Destination set to A & B.");
});

test("map availability and permission notices never turn failure into success", () => {
  const unavailable = "기본 지도를 불러오지 못해 대체 지도를 표시합니다.";
  assert.equal(mapStatusText(unavailable, false), unavailable);
  assert.match(mapStatusText(unavailable, true), /unavailable.*alternative map/);
  assert.match(mapStatusText("기본 지도 연결이 지연되어 대체 지도를 표시합니다.", true), /too long.*alternative map/);
  assert.match(mapStatusText("위치 권한을 허용하면 현재 위치로 이동할 수 있습니다.", true), /^Allow location access/);
  assert.match(mapStatusText("지도를 불러오지 못했습니다.", true), /could not be loaded/);
});

test("map save feedback retains actual counts and already-saved state", () => {
  assert.equal(mapStatusText("지도에 표시된 1곳을 내 일정에 추가했어요.", true), "Added 1 place from the map to your itinerary.");
  assert.equal(mapStatusText("지도에 표시된 12곳을 내 일정에 추가했어요.", true), "Added 12 places from the map to your itinerary.");
  assert.match(mapStatusText("지도에 표시된 여행지는 이미 내 일정에 있어요.", true), /already in your itinerary/);
});

test("forecast language preserves the given level and does not reinterpret unknown data", () => {
  for (const [level, label] of [["low", "Quiet"], ["moderate", "Moderate"], ["busy", "Busy"], ["very-busy", "Very busy"]]) {
    const visual = { level, label: "원문", message: "원문 설명", rate: 24, color: "#123456" };
    const before = structuredClone(visual);
    assert.equal(mapCrowdText(visual, true).label, label);
    assert.match(mapCrowdText(visual, true).message, /expected/);
    assert.equal(mapCrowdText(visual, false), visual);
    assert.deepEqual(visual, before);
  }
  const unknown = { level: "unconfirmed", label: "확인 불가", message: "아직 확인되지 않음" };
  assert.equal(mapCrowdText(unknown, true), unknown);
});
