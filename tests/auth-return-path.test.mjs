import assert from "node:assert/strict";
import test from "node:test";
import { AUTH_FALLBACK_PATH, safeAuthReturnPath } from "../lib/auth/return-path.js";

test("login return paths keep same-origin destinations intact", () => {
  assert.equal(safeAuthReturnPath("/planner"), "/planner");
  assert.equal(safeAuthReturnPath("/community?category=review#latest"), "/community?category=review#latest");
  assert.equal(safeAuthReturnPath("/"), "/");
});

test("login return paths reject values that resolve outside the site", () => {
  for (const value of [
    "/\\evil.example", "//evil.example", "/%5cevil.example", "/%2f%2fevil.example",
    "/..//evil.example", "/safe/..//evil.example", "https://evil.example",
    "javascript:alert(1)", "evil.example", "/planner%0d%0aLocation:%20https://evil.example", "",
  ]) {
    assert.equal(safeAuthReturnPath(value), AUTH_FALLBACK_PATH);
  }
  assert.equal(safeAuthReturnPath(null), AUTH_FALLBACK_PATH);
  assert.equal(safeAuthReturnPath(undefined), AUTH_FALLBACK_PATH);
});
