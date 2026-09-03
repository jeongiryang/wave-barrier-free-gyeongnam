import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

async function waitForHydration(page: import("@playwright/test").Page) {
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
}

test("비밀번호 재설정 요청은 계정 존재 여부를 구분하지 않는다", async ({ page }) => {
  await mockPublicShellApi(page);
  let requests = 0;
  await page.route("**/api/auth/request-password-reset", async (route) => {
    requests += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: true }) });
  });
  await page.goto("/forgot-password");
  await waitForHydration(page);
  await page.locator("#recovery-email").fill("invalid");
  await page.getByRole("button", { name: "재설정 메일 보내기" }).click();
  await expect(page.locator("#recovery-message")).toContainText("이메일 형식");
  expect(requests).toBe(0);
  await page.locator("#recovery-email").fill("traveler@example.com");
  await page.getByRole("button", { name: "재설정 메일 보내기" }).click();
  await expect(page.locator("#recovery-message")).toContainText("등록된 계정이면");
  await expect(page.locator("#recovery-message")).not.toContainText("없는 계정");
  expect(requests).toBe(1);
});

test("일회용 링크에서 새 비밀번호 확인 뒤 재설정한다", async ({ page }) => {
  await mockPublicShellApi(page);
  let submitted = false;
  await page.route("**/api/auth/reset-password", async (route) => {
    submitted = true;
    const body = route.request().postDataJSON();
    expect(body.token).toBe("valid-reset-token");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: true }) });
  });
  await page.goto("/reset-password?token=valid-reset-token");
  await waitForHydration(page);
  await page.locator("#reset-password").fill("new-password-123");
  await page.locator("#reset-confirm-password").fill("different-password");
  await page.getByRole("button", { name: "새 비밀번호 저장" }).click();
  await expect(page.locator("#reset-message")).toContainText("일치하지 않습니다");
  expect(submitted).toBe(false);
  await page.locator("#reset-confirm-password").fill("new-password-123");
  await page.getByRole("button", { name: "새 비밀번호 저장" }).click();
  await expect(page.locator("#reset-message")).toContainText("새로 설정했습니다");
  expect(submitted).toBe(true);
});

test("로그인 계정은 비밀번호를 변경하고 명시적 확인 뒤 탈퇴한다", async ({ page }) => {
  await page.route("**/api/auth/get-session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user: { id: "account-user", name: "계정 여행자", email: "account@example.com" }, session: { id: "session" } }),
  }));
  let changed = 0;
  await page.route("**/api/auth/change-password", async (route) => {
    changed += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ token: null, user: { id: "account-user" } }) });
  });
  let deleted = 0;
  await page.route("**/api/account", async (route) => {
    deleted += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, deleted: true }) });
  });
  await page.goto("/account");
  await waitForHydration(page);
  await expect(page.getByText("계정 여행자", { exact: false }).first()).toBeVisible();

  await page.locator("#account-current-password").fill("current-password");
  await page.locator("#account-new-password").fill("updated-password");
  await page.locator("#account-confirm-password").fill("updated-password");
  await page.getByRole("button", { name: "비밀번호 변경", exact: true }).click();
  await expect(page.getByText("다른 기기의 로그인 세션을 종료했습니다")).toBeVisible();
  expect(changed).toBe(1);

  await page.locator("#delete-password").fill("updated-password");
  await page.locator("#delete-confirmation").fill("삭제");
  await page.getByRole("button", { name: "계정과 서버 데이터 삭제" }).click();
  await expect(page.getByText(/‘계정 삭제’ 확인 문구/)).toBeVisible();
  expect(deleted).toBe(0);
  await page.locator("#delete-confirmation").fill("계정 삭제");
  await page.getByRole("button", { name: "계정과 서버 데이터 삭제" }).click();
  await expect(page).toHaveURL(/\?account=deleted/);
  expect(deleted).toBe(1);
});

test("계정 복구·관리 화면은 좁은 화면에서도 넘치지 않고 심각한 접근성 위반이 없다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  for (const path of ["/forgot-password", "/reset-password", "/account"]) {
    await page.goto(path);
    await expect(page.locator("#auth-title")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
  }
});
