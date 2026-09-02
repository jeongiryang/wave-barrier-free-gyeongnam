import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AUTH_FIELDS, authFieldInputId } from "../lib/auth/fields.js";
import { checkAuthCredentials } from "../lib/auth/credentials.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("검사가 짚는 모든 칸에 갈 곳이 있다", () => {
  // 검사 쪽이 새 필드를 늘렸는데 여기가 그대로면 초점이 아무 데도 가지 않는다.
  const cases = [
    ["register", {}],
    ["register", { name: "홍길동" }],
    ["register", { name: "홍길동", email: "a@b.com" }],
    ["register", { name: "홍길동", email: "a@b.com", password: "verylongpassword1", confirmPassword: "다름" }],
    ["login", {}],
  ];
  for (const [mode, input] of cases) {
    const { field } = checkAuthCredentials(mode, input);
    assert.ok(field, `${mode} ${JSON.stringify(input)}에 field가 없다`);
    assert.ok(authFieldInputId(field), `${field}에 대응하는 입력 id가 없다`);
  }
});

test("모르는 값에는 아무 곳도 가리키지 않는다", () => {
  assert.equal(authFieldInputId(""), null);
  assert.equal(authFieldInputId(undefined), null);
  assert.equal(authFieldInputId("nope"), null);
  // 프로토타입 속성을 id로 착각하지 않는다.
  assert.equal(authFieldInputId("toString"), null);
  assert.equal(authFieldInputId("constructor"), null);
});

test("가리키는 id가 화면에 실제로 있다", async () => {
  const form = await source("features/auth/components/AuthForm.tsx");
  for (const field of AUTH_FIELDS) {
    const id = authFieldInputId(field);
    assert.match(form, new RegExp(`id="${id}"`), `${id} 입력이 화면에 없다`);
  }
});

test("화면이 초점 이동과 오류 표시를 실제로 붙인다", async () => {
  const [hook, form] = await Promise.all([
    source("features/auth/hooks/useAuthForm.ts"),
    source("features/auth/components/AuthForm.tsx"),
  ]);
  assert.match(hook, /authFieldInputId\(/);
  assert.match(hook, /\.focus\(\)/, "오류가 난 칸으로 초점을 옮기지 않는다");
  assert.match(hook, /setInvalidField\(/);
  assert.match(form, /aria-invalid/, "어느 칸이 문제인지 표시하지 않는다");
  // 고치기 시작하면 표시와 오래된 오류 문구를 함께 걷어야 한다.
  assert.match(form, /onInput=\{auth\.clearError\}/);
  assert.match(hook, /setMessage\(""\)/);
});
