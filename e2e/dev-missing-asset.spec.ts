import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

test("a missing asset returns 404 without broadcasting an RSC overlay to another page", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.goto("/planner");
  const preferences = page.locator(".preference-controls:visible");
  await expect(preferences).toHaveAttribute("aria-busy", "false");

  // A separate client reproduces the shared dev-server failure seen in CI.
  const response = await request.get("/__wave_ci_missing_asset__.png");
  expect(response.status()).toBe(404);
  await preferences.getByLabel("환경설정 열기", { exact: true }).click();
  await expect(preferences).toHaveAttribute("open");
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  expect(errors).toEqual([]);
});
