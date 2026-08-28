import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("service journey redesign and no-login judging path are documented", async () => {
  const [journey, account] = await Promise.all([
    source("docs/service-journey-refresh.md"),
    source("docs/contest-test-account.md"),
  ]);
  assert.match(journey, /\/photo-course/);
  assert.match(journey, /도보·자전거·대중교통·자동차/);
  assert.match(account, /제출 선택: 로그인 불필요/);
  assert.match(account, /테스트 계정 생성 불필요/);
  assert.match(account, /공개 게시글 읽기는 로그인 없이 가능/);
  assert.doesNotMatch(account, /예정 ID|지정 비밀번호|생성 완료|로그인 검증 완료/);
});
