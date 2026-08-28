import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("service journey redesign is documented without claiming the test account exists", async () => {
  const [journey, account] = await Promise.all([
    source("docs/service-journey-refresh.md"),
    source("docs/contest-test-account.md"),
  ]);
  assert.match(journey, /\/photo-course/);
  assert.match(journey, /도보·자전거·대중교통·자동차/);
  assert.match(account, /실제 계정 생성.+완료로 처리/);
  assert.doesNotMatch(account, /생성 완료|로그인 검증 완료/);
});
