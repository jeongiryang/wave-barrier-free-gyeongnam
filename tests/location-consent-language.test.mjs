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
    assert.match(messages[0], locale === "en" ? /^Check distance on this device\?/ : /^이 기기에서 거리를 확인할까요\?/);
    assert.match(messages[0], locale === "en" ? /not sent.*map providers.*public place/ : /지도 제공처.*전송하거나 저장하지.*공개 장소/);
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
