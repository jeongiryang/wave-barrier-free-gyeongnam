import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { cleanCommunityText, communitySearchPattern } from "../lib/community/validation.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("보통 검색어는 그대로 감싼다", () => {
  assert.equal(communitySearchPattern("통영 맛집"), "%통영 맛집%");
  assert.equal(communitySearchPattern(""), "%%");
  assert.equal(communitySearchPattern(undefined), "%%");
});

test("밑줄은 한 글자 와일드카드가 아니라 글자 그대로 찾는다", () => {
  // "진_시"가 진주시·진해시를 함께 찾으면 사용자가 적지 않은 조건이 붙은 것이다.
  assert.equal(communitySearchPattern("진_시"), "%진\\_시%");
});

test("퍼센트는 아무 문자열이 아니라 글자 그대로 찾는다", () => {
  assert.equal(communitySearchPattern("50%"), "%50\\%%");
  assert.equal(communitySearchPattern("%"), "%\\%%");
});

test("역슬래시로 끝나는 검색어가 패턴을 깨뜨리지 않는다", () => {
  // Postgres는 이스케이프 문자로 끝나는 LIKE 패턴을 거부한다. 그대로 넘기면
  // 검색 결과가 이상해지는 정도가 아니라 목록 요청 자체가 실패한다.
  const pattern = communitySearchPattern("100\\");
  assert.equal(pattern, "%100\\\\%");
  assert.ok(!/(^|[^\\])\\$/.test(pattern.slice(0, -1)), "패턴이 홀수 개의 역슬래시로 끝나면 안 된다");
});

test("이스케이프 문자가 섞여도 개수가 맞는다", () => {
  assert.equal(communitySearchPattern("a_b%c\\d"), "%a\\_b\\%c\\\\d%");
});

test("제어문자 제거와 와일드카드 이스케이프는 함께 동작한다", () => {
  const cleaned = cleanCommunityText("통영_맛집", 80);
  assert.equal(communitySearchPattern(cleaned), "%통영\\_맛집%");
});

test("목록 질의는 직접 패턴을 만들지 않는다", async () => {
  const repository = await source("features/community/server/post-read-repository.ts");
  assert.match(repository, /communitySearchPattern\(search\)/);
  // 여기서 문자열을 직접 붙이면 이스케이프가 다시 빠진다.
  assert.doesNotMatch(repository, /`%\$\{search\}%`/);
});
