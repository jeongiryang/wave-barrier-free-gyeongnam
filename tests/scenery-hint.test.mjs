import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { sceneryCondition, sceneryHint } from "../lib/scenery-hint.js";

test("예보 코드는 비·맑음·그 밖을 보수적으로 구분한다", () => {
  for (const code of [51, 61, 71, 80, 85, 95]) assert.equal(sceneryCondition({ code, rainProbability: 0 }), "rain");
  assert.equal(sceneryCondition({ code: 0, rainProbability: 50 }), "rain");
  for (const code of [0, 1, 2]) assert.equal(sceneryCondition({ code, rainProbability: 10 }), "clear");
  for (const value of [{ code: 3, rainProbability: 10 }, { code: 0, rainProbability: -1 }, { code: 0, rainProbability: 101 }]) {
    assert.equal(sceneryCondition(value), "other");
  }
});

test("명세의 세 조합만 안내하고 미확인 장소는 항상 숨긴다", () => {
  assert.deepEqual(sceneryHint("rain", "outdoor"), { text: "이 날은 비 소식이 있어요. 바깥에서 보는 곳이에요.", source: "Open-Meteo 예보 · 관광정보 설명 기준" });
  assert.deepEqual(sceneryHint("rain", "indoor"), { text: "이 날은 비 소식이 있어요. 실내에서 볼 수 있는 곳이에요.", source: "Open-Meteo 예보 · 관광정보 설명 기준" });
  assert.deepEqual(sceneryHint("clear", "outdoor"), { text: "이 날은 맑음이에요. 바깥에서 보는 곳이에요.", source: "Open-Meteo 예보 · 관광정보 설명 기준" });
  for (const condition of ["rain", "clear", "other"]) assert.equal(sceneryHint(condition, "unknown"), null);
  assert.equal(sceneryHint("clear", "indoor"), null);
  assert.equal(sceneryHint("other", "outdoor"), null);
});

test("안내는 결정적이며 추천·순위·점수 표현이나 부수효과 API가 없다", async () => {
  const first = sceneryHint("rain", "indoor");
  assert.deepEqual(sceneryHint("rain", "indoor"), first);
  const text = [sceneryHint("rain", "outdoor"), sceneryHint("rain", "indoor"), sceneryHint("clear", "outdoor")].map(value => value?.text).join(" ");
  assert.doesNotMatch(text, /추천|순위|점수|별점|오늘의/);
  const source = await readFile(new URL("../lib/scenery-hint.js", import.meta.url), "utf8");
  for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "navigator", "geolocation", "Date(", "Math.random"]) {
    assert.equal(source.includes(forbidden), false, `순수 함수가 부수효과 API를 참조합니다: ${forbidden}`);
  }
  for (const file of ["../features/planner/components/PlaceResultRow.tsx", "../features/planner/components/WeatherBoard.tsx"]) {
    const uiSource = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(uiSource, /fetch\s*\(|fetchVisitInfo|navigator\.geolocation/,
      `${file}이 날씨 안내를 위해 별도 제공처나 위치 요청을 추가했습니다`);
  }
});
