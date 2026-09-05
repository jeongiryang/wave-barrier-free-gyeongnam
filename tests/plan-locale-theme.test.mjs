import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  // Git can check out the same source with CRLF on Windows and LF on CI.
  return (await readFile(new URL(`../${path}`, import.meta.url), "utf8")).replace(/\r\n/g, "\n");
}

test("사용자가 고른 테마는 서비스 계열에 맞는 콘텐츠 유형으로 적용된다", async () => {
  const builder = await source("server/tourism/plan-builder.ts");
  const regionalCalls = [...builder.matchAll(/fetchRegionalList\(env, ([^,]+), "areaBasedList2", ([^,]+),/g)]
    .map(([, service, params]) => ({ service: service.trim(), params: params.trim() }));

  assert.equal(regionalCalls.length, 1, "공통 조회 함수가 선택된 테마마다 호출된다");
  assert.deepEqual(regionalCalls, [
    { service: "service", params: "{\n      ...params" },
  ]);
  assert.match(builder, /themes\.map/);
  assert.match(builder, /fetchThemes\("KorWithService2", barrierLocationParams\)/);
  assert.match(builder, /fetchThemes\(language.service, localizedLocationParams, true\)/);
});

test("국문과 다국어 콘텐츠 유형 코드는 섞이지 않는다", async () => {
  const [query, catalog] = await Promise.all([
    source("server/tourism/plan-query.ts"),
    source("server/tourism/catalog.ts"),
  ]);
  assert.match(query, /barrierLocationParams = \{[^}]*contentTypeId: contentTypes\[theme\]/);
  assert.match(query, /locale === "ko" \? contentTypes\[theme\] : multilingualContentTypes\[theme\]/);
  assert.match(catalog, /multilingualContentTypes:[\s\S]*nature: "76"[\s\S]*history: "78"[\s\S]*leisure: "75"[\s\S]*food: "80"/);
});
