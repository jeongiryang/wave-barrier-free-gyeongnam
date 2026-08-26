import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AUTH_FALLBACK_PATH, safeAuthReturnPath } from "../lib/auth/return-path.js";

test("login return paths keep same-origin destinations intact", () => {
  assert.equal(safeAuthReturnPath("/planner"), "/planner");
  assert.equal(safeAuthReturnPath("/community?category=review"), "/community?category=review");
  assert.equal(safeAuthReturnPath("/evil.example"), "/evil.example");
  assert.equal(safeAuthReturnPath("/"), "/");
});

test("login return paths reject every value that resolves to another site", () => {
  // `//`만 막으면 `/\`가 통과한다. URL 파서는 백슬래시를 슬래시로 정규화하므로
  // 브라우저는 이 값을 https://evil.example 로 해석한다.
  assert.equal(safeAuthReturnPath("/\\evil.example"), AUTH_FALLBACK_PATH);
  assert.equal(safeAuthReturnPath("/\/evil.example"), AUTH_FALLBACK_PATH);
  assert.equal(safeAuthReturnPath("//evil.example"), AUTH_FALLBACK_PATH);
  assert.equal(safeAuthReturnPath("https://evil.example"), AUTH_FALLBACK_PATH);
  assert.equal(safeAuthReturnPath("javascript:alert(1)"), AUTH_FALLBACK_PATH);
  assert.equal(safeAuthReturnPath("evil.example"), AUTH_FALLBACK_PATH);
});

test("login return paths fall back when nothing usable is given", () => {
  assert.equal(safeAuthReturnPath(""), AUTH_FALLBACK_PATH);
  assert.equal(safeAuthReturnPath(null), AUTH_FALLBACK_PATH);
  assert.equal(safeAuthReturnPath(undefined), AUTH_FALLBACK_PATH);
  assert.equal(safeAuthReturnPath(["/planner"]), AUTH_FALLBACK_PATH);
});

test("the auth feature resolves return paths in one shared module", async () => {
  const validation = await readFile(new URL("../features/auth/validation.ts", import.meta.url), "utf8");
  assert.match(validation, /from "\.\.\/\.\.\/lib\/auth\/return-path\.js"/);
  assert.doesNotMatch(validation, /startsWith\("\/\/"\)/);
});
