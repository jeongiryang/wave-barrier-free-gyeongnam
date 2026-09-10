import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

test("a pointer press near the viewport edge keeps the readiness action under the pointer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page, { crowdRate: 65 });
  await mockPublicShellApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const shortcut = page.locator('.readiness-grid a[href="#crowd"]');
  await shortcut.scrollIntoViewIfNeeded();
  await expect(page.locator(".departure-readiness")).toHaveCSS("opacity", "1");
  await shortcut.evaluate(element => window.scrollBy({ top: element.getBoundingClientRect().bottom - innerHeight, behavior: "instant" }));
  const before = (await shortcut.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  // A real press can span a rendering frame; releasing must still activate the same link.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.mouse.up();
  await expect(page.locator("#layers")).toHaveAttribute("open");
  await expect(page.locator(".impact-response h3")).toBeFocused();
  await expect(page).toHaveURL(/#crowd$/);
});
