import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

async function prepare(page: Page) {
  await mockPlannerApi(page);
  await page.addInitScript(() => localStorage.setItem("wave-locale", "en"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await page.getByRole("button", { name: "Changwon", exact: true }).click();
  await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
  await page.getByRole("button", { name: /Nature and relaxation/ }).click();
  await page.getByRole("button", { name: "Find places →", exact: true }).click();
  await page.getByRole("button", { name: "경남도립미술관 Add to itinerary", exact: true }).click();
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
}

test("English map endpoint controls expose their names and return keyboard focus on Escape", async ({ page }) => {
  await prepare(page);
  await expect(page.getByRole("region", { name: "Check your route", exact: true })).toBeVisible();
  const origin = page.locator(".map-toolbar").getByRole("button", { name: /Change departure/ });
  await origin.focus();
  await page.keyboard.press("Enter");
  const picker = page.getByRole("region", { name: "Where will you start?", exact: true });
  await expect(picker.getByRole("textbox", { name: "Search places", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await expect(origin).toBeFocused();
});

for (const theme of ["light", "dark"] as const) {
  test(`point picker ${theme} keeps ten results accessible across narrow and wide screens`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("wave-theme", value), theme);
    await prepare(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/location-search?**", (route) => route.fulfill({ json: { places: Array.from({ length: 10 }, (_, index) => ({ id: `station-${index}`, name: `경상남도 여행역 ${index + 1}`, mapX: "128.691", mapY: "35.238", address: "경상남도 창원시", category: "Station" })) } }));
    const origin = page.locator(".map-toolbar").getByRole("button", { name: /Change departure/ });
    for (const width of [320, 390, 768, 1366]) {
      await page.setViewportSize({ width, height: 844 });
      await origin.click();
      const picker = page.locator(".trip-point-picker");
      await picker.getByRole("textbox", { name: "Search places", exact: true }).fill("station");
      await picker.getByRole("button", { name: "Search", exact: true }).click();
      await expect(picker.getByRole("status")).toContainText("10 places found");
      const last = picker.getByRole("button", { name: /경상남도 여행역 10/ });
      await last.focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      await expect(last).toBeFocused();
      expect(await last.evaluate((element) => element.matches(":focus-visible"))).toBe(true);
      expect(await last.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      })).toBe(true);
      for (const control of await picker.locator("button,input").all()) {
        const rect = await control.boundingBox();
        expect(rect!.width).toBeGreaterThanOrEqual(44);
        expect(rect!.height).toBeGreaterThanOrEqual(44);
        expect(rect!.x).toBeGreaterThanOrEqual(0);
        expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
      }
      expect(await picker.locator(".trip-point-list strong").evaluateAll((names) => names.every((name) => name.scrollWidth <= name.clientWidth))).toBe(true);
      expect((await new AxeBuilder({ page }).include(".trip-point-picker").analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({ path: test.info().outputPath(`picker-${width}-${theme}.png`) });
      await page.keyboard.press("Escape");
      await expect(origin).toBeFocused();
    }
    expect(errors).toEqual([]);
  });
}

test("a failed point search retries successfully without duplicate requests or changing the itinerary", async ({ page }) => {
  await prepare(page);
  let calls = 0;
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/location-search?**", async (route) => {
    calls++;
    if (calls === 1) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    await held;
    await route.fulfill({ json: { places: [{ id: "station", name: "Public station", mapX: "128.691", mapY: "35.238", address: "Changwon", category: "Station" }] } });
  });
  await page.locator(".map-toolbar > button").first().click();
  const picker = page.locator(".trip-point-picker");
  await picker.getByRole("textbox", { name: "Search places", exact: true }).fill("station");
  const submit = picker.locator('button[type="submit"]');
  await submit.click();
  await expect(picker.getByRole("status")).toContainText("Places could not be checked");
  await page.keyboard.press("Enter");
  await expect.poll(() => calls).toBe(2);
  await expect(submit).toBeFocused();
  await page.keyboard.press("Enter");
  expect(calls).toBe(2);
  release();
  await picker.getByRole("button", { name: /Public station/ }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.locator(".map-toolbar > button").first()).toBeFocused();
  await expect(page.locator(".map-toolbar > button").first()).toContainText("Public station");
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
});

for (const state of ["empty", "error", "malformed"] as const) {
  test(`point search distinguishes ${state} response and retains retry button focus`, async ({ page }) => {
    await prepare(page);
    await page.route("**/api/location-search?**", (route) => route.fulfill({ status: state === "error" ? 503 : 200, json: state === "empty" ? { places: [] } : state === "malformed" ? { places: "invalid" } : { error: "Unavailable" } }));
    await page.locator(".map-toolbar > button").first().click();
    const picker = page.locator(".trip-point-picker");
    await picker.locator("form input").fill("Changwon");
    const submit = picker.locator('button[type="submit"]');
    await submit.click();
    await expect(picker.getByRole("status")).toContainText(state === "empty" ? "No places found" : "Places could not be checked");
    await expect(submit).toBeFocused();
    await expect(submit).toBeEnabled();
    await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
  });
}

test("typing a new location cancels pending results and searching again uses only the new query", async ({ page }) => {
  await prepare(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/location-search?**", async (route) => {
    requests++;
    const old = new URL(route.request().url()).searchParams.get("q") === "old place";
    if (old) await held;
    await route.fulfill({ json: { places: [{ id: old ? "old" : "new", name: old ? "Old place result" : "New place result", mapX: "128.691", mapY: "35.238", address: "Changwon", category: "Station" }] } });
  });
  await page.locator(".map-toolbar > button").first().click();
  const picker = page.locator(".trip-point-picker");
  const input = picker.locator("form input");
  const submit = picker.locator('button[type="submit"]');
  await input.fill("old place");
  await submit.click();
  await expect.poll(() => requests).toBe(1);
  await input.fill("new place");
  await expect(submit).toBeEnabled();
  release();
  await submit.click();
  await expect(picker.getByRole("button", { name: /New place result/ })).toBeVisible();
  await expect(picker.getByRole("button", { name: /Old place result/ })).toHaveCount(0);
  expect(requests).toBe(2);
});

test("pending route recalculation retains keyboard focus and ignores duplicate activation", async ({ page }) => {
  await prepare(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/route?**", async (route) => {
    requests++;
    await held;
    await route.fulfill({ json: { configured: false, alternatives: [], providers: [], context: null } });
  });
  const button = page.locator(".recalculate-button");
  await button.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => requests).toBe(1);
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  expect(requests).toBe(1);
  release();
  await expect(page.locator(".route-notice")).toContainText("No verified journey time");
  await expect(button).toBeFocused();
});
