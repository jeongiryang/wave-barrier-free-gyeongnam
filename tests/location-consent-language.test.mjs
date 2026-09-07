import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../lib/location-consent.js", import.meta.url), "utf8").replace("export function", "function");

for (const locale of ["en", "ko", "ja", undefined]) {
  test(`location notice uses the chosen locale and preserves refusal: ${locale}`, () => {
    const messages = [];
    const context = vm.createContext({
      document: { documentElement: { lang: locale === "en" ? "ko" : "en" } },
      window: { confirm: message => { messages.push(message); return false; } },
    });
    vm.runInContext(source, context);
    assert.equal(context.confirmMapLocationUse(locale), false);
    assert.equal(messages.length, 1);
    assert.match(messages[0], locale === "en" ? /^Show your current location\?/ : /^현재 위치를 표시할까요\?/);
    assert.match(messages[0], locale === "en" ? /Kakao.*public departure point/ : /카카오.*공개 출발 거점/);
  });
}

test("location notice fails closed during server rendering", () => {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  assert.equal(context.confirmMapLocationUse("en"), false);
});

test("a notice acceptance is returned without reading coordinates", () => {
  const context = vm.createContext({ window: { confirm: () => true } });
  vm.runInContext(source, context);
  assert.equal(context.confirmMapLocationUse("en"), true);
});
