import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { NO_STORE, PUBLIC_CACHE_CONTROL, cacheControlHeader } from "../lib/http-cache.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("성공 응답만 CDN에 캐시된다", () => {
  assert.equal(cacheControlHeader(true, 200), PUBLIC_CACHE_CONTROL);
  assert.equal(cacheControlHeader(true, 201), PUBLIC_CACHE_CONTROL);
  assert.equal(cacheControlHeader(false, 200), NO_STORE);
});

test("상류 장애 응답은 캐시 요청을 무시하고 no-store로 나간다", () => {
  // 이걸 놓치면 한 번의 상류 장애가 엣지에 30분 고정돼, 상류가 복구돼도
  // 사용자는 계속 실패 화면을 본다.
  for (const status of [400, 403, 404, 413, 429, 500, 502, 503]) {
    assert.equal(cacheControlHeader(true, status), NO_STORE, `${status}는 캐시하면 안 된다`);
  }
});

test("관광 사진·혼잡도 핸들러는 성공과 실패를 같은 자리에서 만든다", async () => {
  // 이 형태가 남아 있는 한 캐시 판단을 호출부에 맡길 수 없다.
  const handler = await source("server/tourism/handler.ts");
  assert.match(handler, /result\.ok \? 200 : 502, true/);
  const http = await source("server/shared/http.ts");
  assert.match(http, /cacheControlHeader\(cache, status\)/);
  assert.doesNotMatch(http, /cache \? "public/);
});
