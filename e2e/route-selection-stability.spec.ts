import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

for (const continuing of [false, true]) test(`a delayed search ${continuing ? "respects the next keyboard action" : "reveals results when the user waits"}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    const calls: string[] = [];
    Object.assign(window, { resultScrolls: calls });
    Element.prototype.scrollIntoView = function (...args) {
      calls.push(this.id);
      return original.apply(this, args);
    };
  });
  await mockPlannerApi(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(/\/api\/wave\?.*action=plan/, async (request) => { await held; await request.fallback(); });
  try {
    await page.goto("/planner");
    await chooseTripConditions(page);
    if (continuing) await page.keyboard.press("Shift+Tab");
    const focused = await page.evaluateHandle(() => document.activeElement);
    release();
    await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
    if (continuing) {
      // Observe beyond the delayed reveal, without changing the product or assertion budget.
      await page.waitForTimeout(200);
      expect(await page.evaluate(() => (window as unknown as { resultScrolls: string[] }).resultScrolls)).not.toContain("places");
      expect(await focused.evaluate((element) => element === document.activeElement)).toBe(true);
    } else {
      await expect.poll(() => page.evaluate(() => (window as unknown as { resultScrolls: string[] }).resultScrolls)).toContain("places");
    }
  } finally { release(); }
});

for (const width of [390, 768, 1366]) test(`a delayed map at ${width}px keeps route choices in place and preserves a held click`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 960 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let heldMapRequests = 0;
  await page.route(/\/components\/RouteMap\.tsx(?:\?|$)/, async (request) => {
    heldMapRequests += 1;
    await held;
    await request.continue();
  });
  try {
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가" }).click();
    await expect(page.getByRole("region", { name: "날짜별 여행 일정" }).getByText(/10:25 · 경남도립미술관/)).toBeVisible();
    await expect(page.locator(".map-load-placeholder")).toBeVisible();
    expect(heldMapRequests, "the delayed-map fixture must intercept the module request").toBeGreaterThan(0);
    const calm = page.getByRole("button", { name: /여유 자동차 경로/ });
    await calm.hover();
    const start = await calm.boundingBox();
    expect(start).not.toBeNull();
    const before = await calm.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
    await page.mouse.down();
    release();
    await expect(page.locator(".route-map-shell")).toBeVisible();
    const after = await calm.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    await page.mouse.up();
    expect(Math.abs(after - before), "map loading must not move route choices").toBeLessThanOrEqual(1);
    await expect(calm).toHaveAttribute("aria-pressed", "true");
    await expect(calm).toBeFocused();
    await expect(page.getByRole("region", { name: "날짜별 여행 일정" }).getByText(/10:40 · 경남도립미술관/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`route-selection-${width}.png`) });
  } finally { release(); }
});

test("route selection stays under the pointer while map rendering settles", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가" }).click();
  const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
  await expect(itinerary.getByText(/10:25 · 경남도립미술관/)).toBeVisible();
  await page.getByRole("button", { name: /여유 자동차 경로/ }).click();
  await expect(itinerary.getByText(/10:40 · 경남도립미술관/)).toBeVisible();
  const fast = page.getByRole("button", { name: /추천 자동차 경로/ });
  await fast.scrollIntoViewIfNeeded();
  const box = await fast.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.evaluate(() => new Promise<void>((resolve) => {
    let frames = 10;
    const tick = () => --frames ? requestAnimationFrame(tick) : resolve();
    requestAnimationFrame(tick);
  }));
  await page.mouse.up();
  await expect(fast).toHaveAttribute("aria-pressed", "true");
  await expect(fast).toBeFocused();
  await expect(itinerary.getByText(/10:25 · 경남도립미술관/)).toBeVisible();
});
