import assert from "node:assert/strict";
import test from "node:test";
import { assessTripImpact } from "../lib/trip-impact.js";

test("rain on an outdoor-oriented plan offers a real culture re-search action", () => {
  const impact = assessTripImpact({
    weatherDay: { code: 61, label: "비", max: 25, rainProbability: 80, rain: 9, snow: 0, uv: 2 },
    theme: "food,nature",
  });
  assert.equal(impact.level, "warning");
  assert.match(impact.signals[0].detail, /강수 확률 80%/);
  assert.deepEqual(impact.actions, [{ id: "culture", label: "역사·문화 후보로 다시 찾기" }]);
});

test("high tourism concentration offers the next official recommendation for comparison", () => {
  const impact = assessTripImpact({
    crowd: { rate: 78.4, baseYmd: "20260819", place: "첫 장소" },
    destination: "첫 장소",
    alternative: "두 번째 장소",
  });
  assert.equal(impact.level, "critical");
  assert.match(impact.signals[0].detail, /78\.4%/);
  assert.deepEqual(impact.actions, [{ id: "alternative", label: "두 번째 장소(으)로 교체 검토" }]);
});

test("missing external signals stays explicitly unknown instead of inventing safety", () => {
  const impact = assessTripImpact({ theme: "food" });
  assert.equal(impact.level, "watch");
  assert.match(impact.signals[0].title, /확인하지 못했습니다/);
  assert.equal(impact.actions.length, 0);
});

test("out-of-range trip dates use current conditions without calling them a forecast", () => {
  const impact = assessTripImpact({
    current: { label: "맑음", temperature: 29, precipitation: 0 },
    theme: "nature",
  });
  assert.equal(impact.level, "watch");
  assert.match(impact.signals[0].label, /현재 날씨만 확인/);
  assert.match(impact.signals[0].title, /예보 범위 밖/);
  assert.equal(impact.actions.length, 0);
});
