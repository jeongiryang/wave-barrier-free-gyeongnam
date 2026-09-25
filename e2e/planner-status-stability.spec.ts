import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

for (const width of [390, 1440]) test(`${width}px automatic search completion preserves a held theme click`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  let release!: () => void;
  const responseGate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/wave?action=plan*", async route => {
    await responseGate;
    await route.fallback();
  });
  await page.goto("/planner?region=창원");
  const status = page.locator(".simple-searching");
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("role", "status");
  await expect(status).toHaveAttribute("aria-hidden", "false");
  const theme = page.getByRole("button", { name: "자연·휴양", exact: true });
  await expect(theme).toHaveAttribute("aria-pressed", "false");
  await theme.scrollIntoViewIfNeeded();
  const before = (await theme.boundingBox())!;
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  release();
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(status).toBeHidden();
  await expect(status).not.toHaveAttribute("role", "status");
  await expect(status).toHaveAttribute("aria-hidden", "true");
  const after = (await theme.boundingBox())!;
  expect(after.y).toBeCloseTo(before.y, 1);
  expect(after.x).toBeCloseTo(before.x, 1);
  await page.mouse.up();
  await expect(theme).toHaveAttribute("aria-pressed", "true");
});
