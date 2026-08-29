import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { checkAuthCredentials, looksLikeEmail } from "../lib/auth/credentials.js";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

const OK_PASSWORD = "verylongpassword1";

test("빈 이메일을 그대로 통과시키지 않는다", () => {
  // 예전에는 이메일을 아예 검사하지 않아 서버까지 갔고, 요청이 실패한 뒤
  // "계정 서비스 연결이 지연되고 있습니다"가 떴다. 자기 입력 문제인 줄 알 수 없었다.
  const result = checkAuthCredentials("login", { email: "", password: OK_PASSWORD });
  assert.equal(result.value, undefined);
  assert.equal(result.field, "email");
  assert.match(result.error, /이메일을 입력/);
  assert.doesNotMatch(result.error, /연결이 지연/);
});

test("공백만 있는 이메일도 빈 것으로 본다", () => {
  const result = checkAuthCredentials("login", { email: "   ", password: OK_PASSWORD });
  assert.equal(result.field, "email");
});

test("형식이 아닌 이메일은 예시와 함께 돌려준다", () => {
  for (const email of ["notanemail", "a@b", "a@@b.com", "@example.com", "wave@", "a b@example.com", "a@.com", "a@example."]) {
    const result = checkAuthCredentials("login", { email, password: OK_PASSWORD });
    assert.equal(result.field, "email", `${email}을 통과시켰다`);
    assert.match(result.error, /형식/);
  }
});

test("멀쩡한 주소를 막지 않는다", () => {
  // 지나치게 좁히면 실제로 쓰이는 주소를 막게 된다.
  for (const email of [
    "wave@example.com",
    "wave.traveler@example.co.kr",
    "wave+gyeongnam@example.com",
    "wave_1@sub.example.com",
    "WAVE@Example.COM",
    "a@b.co",
  ]) {
    assert.equal(looksLikeEmail(email), true, `${email}을 막았다`);
    assert.equal(checkAuthCredentials("login", { email, password: OK_PASSWORD }).field, undefined);
  }
});

test("검사 순서가 화면에 놓인 순서와 같다", () => {
  // 위에서부터 채우는 사람에게 아래쪽 오류부터 알려 주면 어디를 볼지 찾아야 한다.
  assert.equal(checkAuthCredentials("login", {}).field, "email");
  assert.equal(checkAuthCredentials("register", {}).field, "name");
  assert.equal(checkAuthCredentials("register", { name: "홍길동" }).field, "email");
  assert.equal(checkAuthCredentials("register", { name: "홍길동", email: "a@b.com" }).field, "password");
  assert.equal(
    checkAuthCredentials("register", { name: "홍길동", email: "a@b.com", password: OK_PASSWORD, confirmPassword: "다름" }).field,
    "confirmPassword",
  );
});

test("모두 올바르면 다듬은 값을 돌려준다", () => {
  const result = checkAuthCredentials("register", {
    name: "  홍길동  ",
    email: "  wave@example.com  ",
    password: OK_PASSWORD,
    confirmPassword: OK_PASSWORD,
  });
  assert.equal(result.error, undefined);
  assert.deepEqual(result.value, { email: "wave@example.com", password: OK_PASSWORD, name: "홍길동" });
});

test("로그인은 이름과 비밀번호 확인을 요구하지 않는다", () => {
  const result = checkAuthCredentials("login", { email: "wave@example.com", password: OK_PASSWORD });
  assert.equal(result.error, undefined);
  assert.equal(result.value.name, "");
});

test("화면이 이 검사를 실제로 쓴다", async () => {
  const validation = await source("features/auth/validation.ts");
  assert.match(validation, /checkAuthCredentials\(/);
  // 같은 규칙이 두 곳에 흩어지면 한쪽만 고치는 일이 생긴다.
  assert.doesNotMatch(validation, /password\.length < 8/);
});
