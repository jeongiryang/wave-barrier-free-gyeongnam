import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("Naru reveals restored and keyboard focus without moving a control during a pointer click", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 839 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner?region=창원");
  const activity = page.getByRole("button", { name: "자연·휴양", exact: true });
  await expect(activity).toBeEnabled();
  await expect(page.locator('.simple-results[aria-busy="false"]')).toBeVisible();
  const alignWithLauncher = () => activity.evaluate(element => {
    const launcher = document.querySelector(".naru-discovery")!;
    const target = element.getBoundingClientRect(), floating = launcher.getBoundingClientRect();
    window.scrollBy({ top: target.top - floating.top - 8, behavior: "instant" });
  });
  await alignWithLauncher();
  const before = (await activity.boundingBox())!;
  const floating = (await page.locator(".naru-discovery").boundingBox())!;
  expect(before.y + before.height).toBeGreaterThan(floating.y);
  expect(before.y).toBeLessThan(floating.y + floating.height);
  expect(before.x).toBeLessThan(floating.x + floating.width);
  // The right side is visible even though another part of this real button
  // overlaps the floating launcher. Keep pointerdown/up on that same point.
  const point = { x: before.x + before.width - 5, y: before.y + before.height / 2 };
  expect(await activity.evaluate((element, point) => element.contains(document.elementFromPoint(point.x, point.y)), point)).toBe(true);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(Math.abs((await activity.boundingBox())!.y - before.y)).toBeLessThanOrEqual(1);
  await page.mouse.up();
  await expect(activity).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("wave-trip-themes-v1") || "[]"))).toContain("nature");

  // Returning focus after a pointer action is programmatic, so Chromium may
  // not assign :focus-visible. It still needs to clear the floating launcher.
  await activity.evaluate(element => (element as HTMLElement).blur());
  await alignWithLauncher();
  await activity.evaluate(element => (element as HTMLElement).focus({ preventScroll: true }));
  await expect(activity).toBeFocused();
  await expect.poll(() => activity.evaluate(element => {
    const target = element.getBoundingClientRect(), launcher = document.querySelector(".naru-discovery")!.getBoundingClientRect();
    return target.bottom > launcher.top && target.top < launcher.bottom && target.right > launcher.left && target.left < launcher.right;
  })).toBe(false);

  await activity.evaluate(element => (element as HTMLElement).blur());
  await page.keyboard.press("Tab");
  await alignWithLauncher();
  await activity.evaluate(element => (element as HTMLElement).focus({ preventScroll: true }));
  await expect(activity).toBeFocused();
  await expect.poll(() => activity.evaluate(element => {
    const target = element.getBoundingClientRect(), launcher = document.querySelector(".naru-discovery")!.getBoundingClientRect();
    return target.bottom > launcher.top && target.top < launcher.bottom && target.right > launcher.left && target.left < launcher.right;
  })).toBe(false);
});
