import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

test("Naru reveals restored and keyboard focus without moving a control during a pointer click", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 839 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  // The initial conditions view intentionally keeps the static discovery hint.
  // Mobile search results hide the hint while retaining the avatar (density suite).
  await page.goto("/planner");
  const activity = page.getByRole("button", { name: "자연·휴양", exact: true });
  await expect(activity).toBeEnabled();
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("");
  // Arrange a real selectable control below the fold and wide enough to overlap
  // the avatar. The hero's production spacing is independent of this focus race.
  await activity.evaluate(element => {
    const button = element as HTMLElement;
    button.style.minWidth = '100%';
    button.style.marginTop = `${innerHeight}px`;
  });
  const alignWithLauncher = () => activity.evaluate(element => {
    const launcher = document.querySelector(".naru-discovery")!;
    const target = element.getBoundingClientRect(), floating = launcher.getBoundingClientRect();
    window.scrollBy({ top: target.top - floating.top - 8, behavior: "instant" });
  });
  // Reduced motion keeps the new discovery hint visible but static. Its entire
  // footprint must reveal keyboard focus, not just the avatar underneath it.
  await expect(page.locator('.naru-hint')).toBeVisible();
  await alignWithLauncher();
  await activity.evaluate(element => (element as HTMLElement).focus({ preventScroll: true }));
  await expect(activity).toBeFocused();
  await expect.poll(() => activity.evaluate(element => {
    const target = element.getBoundingClientRect(), floating = document.querySelector('.naru-discovery')!.getBoundingClientRect();
    return target.bottom > floating.top && target.top < floating.bottom && target.right > floating.left && target.left < floating.right;
  })).toBe(false);
  await expect(page.locator('.naru-hint')).toBeVisible();
  await page.getByRole('button', { name: '나루 안내 그만 보기' }).click();
  await expect(page.locator('.naru-hint')).toHaveCount(0);
  await alignWithLauncher();
  const before = (await activity.boundingBox())!;
  const floating = (await page.locator(".naru-discovery").boundingBox())!;
  expect(before.y + before.height).toBeGreaterThan(floating.y);
  expect(before.y).toBeLessThan(floating.y + floating.height);
  expect(before.x).toBeLessThan(floating.x + floating.width);
  expect(before.x + before.width).toBeGreaterThan(floating.x);
  // The middle is visible even though another part of this real button
  // overlaps the floating launcher. Keep pointerdown/up on that same point.
  const point = { x: before.x + before.width / 2, y: before.y + before.height / 2 };
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

  // Finish the native Tab transfer before arranging the next keyboard action.
  // A programmatic focus racing that transfer can be overwritten by Chromium.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "역사·문화", exact: true })).toBeFocused();
  await alignWithLauncher();
  await page.keyboard.press("Shift+Tab");
  await expect(activity).toBeFocused();
  await expect.poll(() => activity.evaluate(element => {
    const target = element.getBoundingClientRect(), launcher = document.querySelector(".naru-discovery")!.getBoundingClientRect();
    return target.bottom > launcher.top && target.top < launcher.bottom && target.right > launcher.left && target.left < launcher.right;
  })).toBe(false);
});
