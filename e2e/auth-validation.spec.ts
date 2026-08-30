import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

/**
 * 이메일을 검사하지 않아, 비우거나 형식을 잘못 적어도 화면에서는 아무 말이 없다가
 * 서버 요청이 실패한 뒤 "계정 서비스 연결이 지연되고 있습니다"가 떴다. 자기 입력
 * 문제인 줄 알 수 없는 안내였다. 화면에서 실제로 눌러 확인한다.
 */

async function submit(page: import("@playwright/test").Page, path: string, fields: Record<string, string>) {
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto(path);
  const form = page.locator("form").first();
  await form.waitFor();
  for (const [name, value] of Object.entries(fields)) {
    await form.locator(`input[name="${name}"]`).fill(value);
  }
  await form.locator("button[type=submit], button:not([type])").first().click();
  return page.locator("[role=alert]").first();
}

test("이메일을 비우면 이메일을 채우라고 말한다", async ({ page }) => {
  const alert = await submit(page, "/login", { password: "verylongpassword1" });
  await expect(alert).toHaveText(/이메일을 입력/);
  // 서비스가 느린 것이 아니라 입력이 비어 있는 것이다.
  await expect(alert).not.toHaveText(/연결이 지연/);
  await expect(page).toHaveURL(/\/login/);
});

test("형식이 아닌 이메일은 예시와 함께 알려 준다", async ({ page }) => {
  const alert = await submit(page, "/login", { email: "notanemail", password: "verylongpassword1" });
  await expect(alert).toHaveText(/이메일 형식/);
  await expect(alert).toHaveText(/wave@example\.com/);
});

test("빈 폼은 맨 위 항목부터 알려 준다", async ({ page }) => {
  // 위에서부터 채우는 사람에게 아래쪽 오류부터 알려 주면 어디를 볼지 찾아야 한다.
  await expect(await submit(page, "/login", {})).toHaveText(/이메일/);
  await expect(await submit(page, "/register", {})).toHaveText(/표시 이름/);
});

test("올바른 이메일은 형식 오류로 막지 않는다", async ({ page }) => {
  const alert = await submit(page, "/login", { email: "wave.traveler+gyeongnam@example.co.kr", password: "verylongpassword1" });
  // 계정 서비스가 없는 환경이라 이후 단계는 실패할 수 있다. 형식 오류로 막히지만
  // 않으면 된다.
  await expect(alert).not.toHaveText(/이메일 형식/);
  await expect(alert).not.toHaveText(/이메일을 입력/);
});

test("오류가 난 칸으로 초점이 가고 그 칸이 표시된다", async ({ page }) => {
  await submit(page, "/login", { password: "verylongpassword1" });
  // 문구만 띄우면 어느 칸이 문제인지 되짚어 올라가야 한다.
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("auth-email");
  await expect(page.locator("#auth-email")).toHaveAttribute("aria-invalid", "true");
  // 그 칸에서 안내 문구를 읽도록 연결돼야 화면 낭독기가 함께 읽어 준다.
  await expect(page.locator("#auth-email")).toHaveAttribute("aria-describedby", /auth-message/);
  await expect(page.locator("#auth-password")).not.toHaveAttribute("aria-invalid", "true");
});

test("가입 폼도 문제가 된 칸을 짚는다", async ({ page }) => {
  await submit(page, "/register", {
    name: "홍길동", email: "wave@example.com",
    password: "verylongpassword1", confirmPassword: "different1234",
  });
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("auth-confirm-password");
  await expect(page.locator("#auth-confirm-password")).toHaveAttribute("aria-invalid", "true");
});

test("고치기 시작하면 오류 표시를 걷는다", async ({ page }) => {
  await submit(page, "/login", { password: "verylongpassword1" });
  const email = page.locator("#auth-email");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await email.fill("wave@example.com");
  // 아직 틀렸다고 계속 말하면 방금 고친 것이 반영되지 않은 줄 안다.
  await expect(email).not.toHaveAttribute("aria-invalid", "true");
});
