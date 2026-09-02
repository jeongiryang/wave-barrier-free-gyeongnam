import assert from "node:assert/strict";
import test from "node:test";
import { prefersReducedMotion, scrollBehavior, scrollToSection } from "../lib/reduced-motion.js";

test("움직임 줄이기를 켠 사용자는 화면이 즉시 이동한다", () => {
  assert.equal(scrollBehavior(true), "auto");
  assert.equal(scrollBehavior(false), "smooth");
});

test("설정을 읽을 수 없는 환경에서는 기본 동작을 유지한다", () => {
  assert.equal(prefersReducedMotion(), false);
  assert.equal(scrollToSection("route"), false);
});

test("앱에서 calm을 고르면 OS 설정과 같은 즉시 이동 계약을 쓴다", () => {
  globalThis.window = { matchMedia: () => ({ matches: false }) };
  globalThis.document = { documentElement: { dataset: { motion: "calm" } } };
  try {
    assert.equal(prefersReducedMotion(), true);
    assert.equal(scrollBehavior(), "auto");
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});

test("구역 이동은 설정을 그대로 scrollIntoView에 넘긴다", () => {
  const calls = [];
  const target = { scrollIntoView: (options) => calls.push(options) };
  globalThis.document = { getElementById: (id) => (id === "route" ? target : null) };
  try {
    assert.equal(scrollToSection("route", true), true);
    assert.equal(scrollToSection("route", false), true);
    assert.deepEqual(calls, [{ behavior: "auto" }, { behavior: "smooth" }]);

    // 대상이 없으면 조용히 넘어간다.
    assert.equal(scrollToSection("없는구역", false), false);
    assert.equal(calls.length, 2);
  } finally {
    delete globalThis.document;
  }
});

test("설정은 코드가 읽는다. CSS scroll-behavior는 명시한 behavior를 이기지 못한다", () => {
  const seen = [];
  globalThis.window = {
    matchMedia: (query) => {
      seen.push(query);
      return { matches: true };
    },
  };
  try {
    assert.equal(prefersReducedMotion(), true);
    assert.equal(scrollBehavior(), "auto");
    assert.deepEqual(seen, ["(prefers-reduced-motion: reduce)", "(prefers-reduced-motion: reduce)"]);
  } finally {
    delete globalThis.window;
  }
});
