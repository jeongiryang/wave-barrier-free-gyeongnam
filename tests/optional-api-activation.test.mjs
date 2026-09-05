import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeExpresswayResponse } from "../lib/tourism/expressway-response.js";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("한국도로공사 응답은 성공, 빈 결과와 HTTP 200 오류 봉투를 구분한다", () => {
  assert.deepEqual(normalizeExpresswayResponse({ count: 1, list: [{ routeName: "남해고속도로" }] }), {
    items: [{ routeName: "남해고속도로" }],
    total: 1,
  });
  assert.deepEqual(normalizeExpresswayResponse({ count: 0, list: [] }), { items: [], total: 0 });
  assert.throws(
    () => normalizeExpresswayResponse({ code: "AUTH_CODE_ERROR", message: "인증키가 올바르지 않습니다." }),
    /AUTH_CODE_ERROR.*인증키/,
  );
  assert.throws(
    () => normalizeExpresswayResponse({ error: { code: "INVALID_KEY", message: "invalid key" } }),
    /INVALID_KEY.*invalid key/,
  );
});

test("ODsay Vercel 호출과 결과 화면은 도메인 인증·공식 귀속 표시를 갖는다", async () => {
  const [odsay, routePanel] = await Promise.all([
    source("server/transport/odsay.ts"),
    source("features/planner/components/RouteComparisonPanel.tsx"),
  ]);
  assert.match(odsay, /Referer: `\$\{SITE_ORIGIN\}\//);
  assert.match(routePanel, /item\.provider === "ODsay"/);
  assert.match(routePanel, /powered by www\.ODsay\.com/);
});

test("Production 점검은 등록된 선택 API의 실제 오류를 허용하지 않는다", async () => {
  const productionCheck = await source("scripts/check-production-apis.mjs");
  assert.match(productionCheck, /configuredKeys\.has\("odsay"\)/);
  assert.match(productionCheck, /providers\.get\("odsay"\)\?\.state/);
  assert.match(productionCheck, /configuredKeys\.has\("expressway"\)/);
  assert.match(productionCheck, /status\.id === "rest"/);
  assert.match(productionCheck, /statuses\.every\(\(status\) => status\.state !== "error"\)/);
});
