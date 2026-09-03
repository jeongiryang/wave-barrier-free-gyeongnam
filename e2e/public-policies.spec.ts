import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("공개 정책을 찾고 읽고 서로 이동할 수 있다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/policies");
  await expect(page.getByRole("heading", { name: /안심하고 계획하고/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "커뮤니티 운영정책" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "서비스 운영정책", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "개인정보처리방침", exact: true }).first().click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole("heading", { name: /필요한 정보만/ })).toBeVisible();
  const violations = (await new AxeBuilder({ page }).analyze()).violations
    .filter((item) => item.impact === "critical" || item.impact === "serious");
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(errors).toEqual([]);
});
