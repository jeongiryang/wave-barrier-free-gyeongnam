import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { hapticPattern, hapticsSupported, vibrate } from "../lib/haptics.js";

const MODULE = new URL("../lib/haptics.js", import.meta.url);

/** `navigator`를 흉내 낸 상태에서 함수를 돌리고 원래대로 되돌린다. */
function withNavigator(fake, run) {
  const had = Object.prototype.hasOwnProperty.call(globalThis, "navigator");
  const original = had ? Object.getOwnPropertyDescriptor(globalThis, "navigator") : null;
  Object.defineProperty(globalThis, "navigator", { value: fake, configurable: true, writable: true });
  try {
    return run();
  } finally {
    if (original) Object.defineProperty(globalThis, "navigator", original);
    else delete globalThis.navigator;
  }
}

function recorder() {
  const calls = [];
  return { calls, navigator: { vibrate: (pattern) => { calls.push(pattern); return true; } } };
}

test("신호는 두 종류뿐이고 패턴이 정해진 값이다", () => {
  assert.deepEqual(hapticPattern("confirm"), [40]);
  assert.deepEqual(hapticPattern("alert"), [40, 60, 40]);
});

test("정의되지 않은 신호는 빈 패턴이다", () => {
  // 부호 체계를 만들지 않기 위해 임의의 신호를 새로 받아들이지 않는다.
  assert.deepEqual(hapticPattern("braille"), []);
  assert.deepEqual(hapticPattern("long"), []);
});

test("어떤 신호도 세 번을 넘겨 떨리지 않고 총 200ms를 넘지 않는다", () => {
  for (const signal of ["confirm", "alert"]) {
    const pattern = hapticPattern(signal);
    const buzzes = pattern.filter((_, index) => index % 2 === 0);
    assert.ok(buzzes.length <= 2, `${signal} 신호가 두 번을 넘겨 떨린다`);
    const total = pattern.reduce((sum, value) => sum + value, 0);
    assert.ok(total <= 200, `${signal} 신호의 총 진동 시간 ${total}ms 가 200ms 를 넘는다`);
  }
});

test("패턴 배열을 밖에서 바꿔도 다음 호출의 패턴이 그대로다", () => {
  const first = hapticPattern("alert");
  first.push(999);
  assert.deepEqual(hapticPattern("alert"), [40, 60, 40]);
});

test("enabled 가 false 면 navigator.vibrate 를 부르지 않고 false 를 돌려준다", () => {
  const { calls, navigator } = recorder();
  const result = withNavigator(navigator, () => vibrate("confirm", false));
  assert.equal(result, false);
  assert.deepEqual(calls, []);
});

test("enabled 가 true 면 정해진 패턴으로 한 번만 부른다", () => {
  const { calls, navigator } = recorder();
  const result = withNavigator(navigator, () => vibrate("alert", true));
  assert.equal(result, true);
  assert.deepEqual(calls, [[40, 60, 40]]);
});

test("미지원 환경에서 예외를 던지지 않고 false 를 돌려준다", () => {
  assert.equal(withNavigator({}, () => hapticsSupported()), false);
  assert.equal(withNavigator({}, () => vibrate("confirm", true)), false);
  assert.equal(withNavigator(undefined, () => vibrate("confirm", true)), false);
});

test("navigator.vibrate 가 예외를 던져도 기능이 멈추지 않는다", () => {
  const navigator = { vibrate: () => { throw new Error("기기가 거부했습니다"); } };
  assert.equal(withNavigator(navigator, () => vibrate("confirm", true)), false);
});

test("모듈이 네트워크·저장소·위치 API 를 참조하지 않는다", async () => {
  const source = await readFile(MODULE, "utf8");
  for (const forbidden of ["fetch(", "XMLHttpRequest", "localStorage", "sessionStorage", "indexedDB", "document.cookie", "geolocation", "navigator.sendBeacon"]) {
    assert.ok(!source.includes(forbidden), `lib/haptics.js 가 ${forbidden} 를 참조한다`);
  }
});

test("navigator.vibrate 호출이 lib/haptics.js 한 곳에만 있다", async () => {
  const { readdir } = await import("node:fs/promises");
  const suffixes = [".ts", ".tsx", ".js", ".jsx", ".mjs"];
  const found = [];
  async function walk(dir) {
    const entries = await readdir(new URL(`../${dir}/`, import.meta.url), { withFileTypes: true });
    for (const entry of entries) {
      const next = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(next);
      else if (suffixes.some((suffix) => entry.name.endsWith(suffix))) {
        const source = await readFile(new URL(`../${next}`, import.meta.url), "utf8");
        if (/navigator\s*\.\s*vibrate/.test(source)) found.push(next);
      }
    }
  }
  for (const root of ["app", "components", "features", "lib", "server", "worker"]) await walk(root);
  assert.deepEqual(found, ["lib/haptics.js"], `진동 호출이 여러 곳에 흩어져 있다: ${found.join(", ")}`);
});
