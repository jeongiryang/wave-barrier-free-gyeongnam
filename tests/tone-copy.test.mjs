import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { toneText } from "../lib/tone-copy.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const toneCopySources = [
  "features/planner/course-copy.ts",
  "features/planner/naru-copy.ts",
  // 기존 테스트가 표준말 문구를 이 파일에서 직접 확인하므로 한 항목은 사용처에 그대로 둔다.
  "features/planner/components/PlannerAssistant.tsx",
];

/** `{ standard: "...", gyeongnam: "..." }` 형태의 짝을 원본에서 그대로 뽑는다. */
function tonePairs(text) {
  return [...text.matchAll(/\{ standard: "([^"]*)", gyeongnam: "([^"]*)" \}/g)].map(([, standard, gyeongnam]) => ({ standard, gyeongnam }));
}

/** 수치·고유명사·시설 이름 비교용 토큰. 숫자와 한글 아닌 낱말을 뽑는다. */
function factTokens(text) {
  return (text.match(/\d+(?:[.,]\d+)?|[A-Za-z][A-Za-z0-9.'-]*|[%℃]|km|kg/g) || []).sort();
}

test("toneText는 경남 말이 없으면 표준말을 돌려주고 빈 문자열을 돌려주지 않는다", () => {
  assert.equal(toneText({ standard: "표준 문구" }, "gyeongnam"), "표준 문구");
  assert.equal(toneText({ standard: "표준 문구", gyeongnam: "" }, "gyeongnam"), "표준 문구");
  assert.equal(toneText({ standard: "표준 문구", gyeongnam: "   " }, "gyeongnam"), "표준 문구");
  assert.equal(toneText({ standard: "표준 문구", gyeongnam: "경남 문구" }, "gyeongnam"), "경남 문구");
  assert.equal(toneText({ standard: "표준 문구", gyeongnam: "경남 문구" }, "standard"), "표준 문구");
  // 값이 두 가지 외로 오면 표준말로 본다.
  assert.equal(toneText({ standard: "표준 문구", gyeongnam: "경남 문구" }, "jeju"), "표준 문구");
  for (const entry of [{ standard: "표준 문구" }, { standard: "표준 문구", gyeongnam: "경남 문구" }]) {
    for (const tone of ["standard", "gyeongnam"]) assert.notEqual(toneText(entry, tone), "");
  }
});

test("tone-copy 모듈은 네트워크·저장소·위치 API를 참조하지 않는다", async () => {
  const text = await source("lib/tone-copy.js");
  for (const forbidden of ["fetch", "XMLHttpRequest", "localStorage", "sessionStorage", "indexedDB", "geolocation", "navigator", "document", "window", "import("]) {
    assert.equal(text.includes(forbidden), false, `${forbidden} 참조가 남아 있습니다`);
  }
  assert.match(text, /export function toneText/);
});

test("경남 말 문구는 표준말 문구와 수치·고유명사·시설 이름이 같다", async () => {
  const texts = await Promise.all(toneCopySources.map(source));
  let pairCount = 0;
  for (const [index, text] of texts.entries()) {
    const pairs = tonePairs(text);
    // 정규식이 놓친 항목이 없어야 비교가 의미를 가진다.
    assert.equal(pairs.length, (text.match(/gyeongnam: "/g) || []).length, `${toneCopySources[index]}의 문구를 모두 읽지 못했습니다`);
    for (const pair of pairs) {
      assert.deepEqual(factTokens(pair.gyeongnam), factTokens(pair.standard), `수치·고유명사가 달라졌습니다: ${pair.standard}`);
      assert.notEqual(pair.gyeongnam.trim(), "");
      // 표준 한글 표기만 쓴다. 화면 낭독기가 읽을 수 없는 표기를 만들지 않는다.
      assert.match(pair.gyeongnam, /^[가-힣 -~··…‘’“”]+$/u, `표준 한글 표기가 아닙니다: ${pair.gyeongnam}`);
    }
    pairCount += pairs.length;
  }
  assert.ok(pairCount >= 5, "경남 말 문구가 하나도 없습니다");
});

test("경남 말 문구는 존댓말을 유지하고 지역을 희화화하는 표기를 쓰지 않는다", async () => {
  const texts = await Promise.all(toneCopySources.map(source));
  for (const text of texts) {
    for (const pair of tonePairs(text)) {
      const ending = pair.gyeongnam.replace(/[\s.!?…]+$/u, "").slice(-2);
      assert.match(ending, /예|소|다|까|요|서|더|께|지/u, `존댓말 종결이 아닙니다: ${pair.gyeongnam}`);
      for (const caricature of ["마!", "가스나", "머스마", "문디", "쫌!!"]) {
        assert.equal(pair.gyeongnam.includes(caricature), false, `희화화 표현이 있습니다: ${pair.gyeongnam}`);
      }
    }
  }
});

test("말투 설정은 기기 안에만 두고 위치로 말투를 바꾸지 않는다", async () => {
  const [storage, context, controls, layout] = await Promise.all([
    source("features/preferences/storage.ts"),
    source("features/preferences/context.tsx"),
    source("features/preferences/PreferenceControls.tsx"),
    source("app/layout.tsx"),
  ]);
  assert.match(storage, /wave-tone-v1/);
  assert.match(storage, /function readStoredTone\(\)[\s\S]*?try \{[\s\S]*?\} catch \{[\s\S]*?return "standard";/);
  // 명세 28의 품질 측정 전에는 저장된 값으로도 경남 말이 켜지지 않는다.
  assert.match(layout, /dataset\.tone=e&&localStorage\.getItem\('wave-tone-v1'\)==='gyeongnam'\?'gyeongnam':'standard'/);
  assert.match(context, /document\.documentElement\.dataset\.tone = tone/);
  // 기본값은 표준말이다.
  assert.match(context, /useState<Tone>\("standard"\)/);
  // 발표용 게이트가 말투를 막지 않는다.
  assert.match(context, /setTone: \(next\) => setToneState/);
  for (const text of [storage, context, controls]) {
    for (const forbidden of ["geolocation", "presentationOptionsEnabled() && setTone", "fetch("]) {
      assert.equal(text.includes(forbidden), false, `${forbidden} 참조가 남아 있습니다`);
    }
  }
  assert.match(controls, /aria-live="polite"/);
  assert.match(controls, /화면 말투/);
});
