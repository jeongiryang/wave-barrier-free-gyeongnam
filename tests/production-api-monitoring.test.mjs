import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("health 응답은 설정 검사 범위와 필수 키 누락을 HTTP 상태로 구분한다", async () => {
  const health = await source("server/transport/health.ts");
  assert.match(health, /scope: "configuration"/);
  assert.match(health, /const ok = keys\.every/);
  assert.match(health, /ok \? 200 : 503/);
});

test("Production 점검은 실제 사용자 경로와 핵심 외부 응답을 매일 확인한다", async () => {
  const [script, workflow, pkg] = await Promise.all([
    source("scripts/check-production-apis.mjs"),
    source(".github/workflows/production-api-smoke.yml"),
    source("package.json"),
  ]);
  for (const path of ["/api/health", "/api/weather", "/api/location-search", "/api/map-config", "/api/route", "/api/wave", "/api/community/posts", "/api/auth/get-session"]) {
    assert.match(script, new RegExp(path.replaceAll("/", "\\/")));
  }
  assert.match(script, /locale=en/);
  assert.match(script, /status\.id === "tour" && status\.state === "live" && status\.count > 0/);
  assert.match(script, /action=photo/);
  assert.match(script, /action=spot-photo/);
  assert.match(script, /action=crowd/);
  assert.match(script, /AbortSignal\.timeout/);
  assert.match(script, /hostname\.endsWith\("\.vercel\.app"\)/);
  assert.match(workflow, /schedule:[\s\S]*cron: "0 21 \* \* \*"/);
  assert.match(workflow, /npm run check:production/);
  assert.equal(JSON.parse(pkg).scripts["check:production"], "node scripts/check-production-apis.mjs");
});
