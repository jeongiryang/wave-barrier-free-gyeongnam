import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("사용자가 고른 테마는 국문·다국어 관광 서비스에 모두 적용된다", async () => {
  const builder = await source("server/tourism/plan-builder.ts");
  const regionalCalls = [...builder.matchAll(/fetchRegionalList\(env, ([^,]+), "areaBasedList2", ([^,]+),/g)]
    .map(([, service, params]) => ({ service: service.trim(), params: params.trim() }));

  assert.equal(regionalCalls.length, 2, "지역 목록 조회는 무장애·언어 두 서비스에서 온다");
  for (const call of regionalCalls) {
    assert.equal(
      call.params,
      "locationParams",
      `${call.service}가 테마 조건이 빠진 별도 파라미터를 쓴다`,
    );
  }
  // 로케일에 따라 조회 조건을 갈라놓으면 다시 같은 문제가 생긴다.
  assert.doesNotMatch(builder, /locale === "ko" \?/);
});

test("지역 목록 조회 조건에는 테마가 들어 있다", async () => {
  const query = await source("server/tourism/plan-query.ts");
  assert.match(query, /const locationParams = \{[^}]*contentTypeId: contentTypes\[theme\]/);
});
