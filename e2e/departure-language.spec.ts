import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

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
  await expect(page.locator("main.planner-page")).toHaveAttribute("lang", "en");
  expect(await page.getByRole("heading", { name: "What kind of day would you like?", exact: true }).evaluate(el => el.closest("[lang]")?.getAttribute("lang"))).toBe("en");
  const journeys = page.getByRole("region", { name: "Check every journey", exact: true });
  await expect(journeys.locator('li [lang="ko"]').filter({ hasText: "경남도립미술관" })).toHaveText("경남도립미술관");
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [320, 960, 1366]) {
  test(`English ${theme} departure review at ${width}px explains missing evidence and preserves dates`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript((value) => {
      localStorage.setItem("wave-theme", value);
    }, theme);
    await prepare(page);
    const card = page.locator("#departure-readiness");
    await expect(card.getByRole("heading", { name: "Check these details before leaving.", exact: true })).toBeVisible();
    await expect(card.locator("article")).toHaveCount(5);
    const journey = card.locator("article").filter({ has: page.getByText("Journey times", { exact: true }) });
    const mobility = card.locator("article").filter({ has: page.getByText("Access along the journey", { exact: true }) });
    await expect(journey).toHaveCount(1);
    await expect(mobility).toHaveCount(1);
    await expect(mobility).toContainText("Recheck needed");
    await expect(card).toContainText("not a live visitor count");
    await expect(card).toContainText("No forecast is available");
    await expect(card).toContainText("2026-10-08 10:00");
    await expect(card).toContainText("original language");
    await expect(card.locator('[lang="ko"]')).not.toHaveCount(0);
    const refresh = card.getByRole("button", { name: "Refresh places and weather", exact: true });
    await card.locator("article a").last().focus();
    await page.keyboard.press("Tab");
    await expect(refresh).toBeFocused();
    // Verify the real keyboard viewport before element screenshots scroll the tall card.
    for (const [index, button] of (await card.locator(".readiness-actions button").all()).entries()) {
      if (index) await page.keyboard.press("Tab");
      await expect(button).toBeFocused();
      await expect.poll(() => button.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return top === element || element.contains(top);
      })).toBe(true);
    }
    await page.screenshot({ path: test.info().outputPath(`departure-controls-${theme}-${width}.png`) });
    for (const control of await card.locator("button, a").all()) {
      const box = await control.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    for (const text of await card.locator("article > div > span, dt, dd, footer p").all()) {
      expect(await text.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    }
    const violations = (await new AxeBuilder({ page }).include("#departure-readiness").analyze()).violations;
    expect(violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
    await card.screenshot({ path: test.info().outputPath(`departure-${theme}-${width}.png`) });
    expect(errors).toEqual([]);
  });
  }
}

test("calendar failure and retry keep keyboard focus, English notices and the saved trip", async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await prepare(page);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let calls = 0;
  await page.route("**/api/trips", async (route) => {
    calls++;
    if (calls === 1) {
      await gate;
      await route.fulfill({ status: 503, json: { error: "Unavailable" } });
    } else await route.fulfill({ status: 201, json: { url: "/trip/english-calendar" } });
  });
  const card = page.locator("#departure-readiness");
  const calendar = card.locator(".readiness-actions button").last();
  await calendar.focus();
  await page.keyboard.press("Enter");
  await expect(calendar).toHaveText("Preparing calendar");
  await expect(calendar).toBeFocused();
  await page.keyboard.press("Enter");
  expect(calls).toBe(1);
  release();
  await expect(card.getByRole("alert")).toContainText("calendar was not saved");
  await expect(calendar).toBeFocused();
  const downloading = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const download = await downloading;
  const contents = (await readFile((await download.path())!, "utf8")).replaceAll("\r\n ", "");
  expect(contents).toContain("SUMMARY:WAVE Changwon accessible trip");
  expect(contents).toContain("DTSTART;TZID=Asia/Seoul:20261008T100000");
  expect(contents).toContain("경남도립미술관");
  expect(contents).toContain("Before leaving");
  expect(contents).toContain(`URL:${new URL("/trip/english-calendar", baseURL).href}`);
  await expect(card.locator("footer span[role=status]")).toHaveText("Calendar file saved.");
  await expect(calendar).toBeFocused();
  expect(calls).toBe(2);
  expect(errors).toEqual([]);
});

test("changing language updates review and calendar feedback without changing itinerary dates", async ({ page }) => {
  await prepare(page);
  await page.route("**/api/trips", (route) => route.fulfill({ status: 503, json: { error: "Unavailable" } }));
  const card = page.locator("#departure-readiness");
  await card.getByRole("button", { name: "Save calendar (.ics)", exact: true }).click();
  await expect(card.getByRole("alert")).toContainText("calendar was not saved");
  await page.keyboard.press("Control+Home");
  const preferences = page.locator(".preference-controls:visible");
  await preferences.getByLabel("Open preferences", { exact: true }).click();
  await preferences.getByLabel("Language", { exact: true }).selectOption("ko");
  await expect(card.getByRole("heading", { name: "출발 전에 이것만 다시 확인하세요.", exact: true })).toBeVisible();
  await expect(card.getByRole("alert")).toContainText("캘린더를 저장하지 않았습니다");
  await preferences.getByLabel("언어", { exact: true }).selectOption("en");
  await expect(card.getByRole("alert")).toContainText("calendar was not saved");
  await expect(card).toContainText("2026-10-08 10:00");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
});

test("refresh preserves keyboard focus while waiting and after the response", async ({ page }) => {
  await prepare(page);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let calls = 0;
  await page.route("**/api/wave?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("action") === "plan") { calls++; await gate; }
    await route.fallback();
  });
  const refresh = page.locator("#departure-readiness .readiness-actions button").first();
  await refresh.focus();
  await page.keyboard.press("Enter");
  await expect(refresh).toHaveText("Refreshing information");
  await expect(refresh).toBeFocused();
  await page.keyboard.press("Enter");
  expect(calls).toBe(1);
  release();
  await expect(refresh).toHaveText("Refresh places and weather");
  await expect(refresh).toBeFocused();
});

for (const scrollAway of [false, true]) {
  test(`late itinerary loading respects ${scrollAway ? "manual scrolling away" : "the visible keyboard control"}`, async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/TripDayPlanner*", async (route) => { await gate; await route.continue(); });
    await prepare(page);
    await expect(page.getByText("Preparing your itinerary.", { exact: true })).toBeVisible();
    const card = page.locator("#departure-readiness");
    const button = card.getByRole("button", { name: "Refresh places and weather", exact: true });
    await card.locator("article a").last().focus();
    await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    await expect.poll(() => button.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === element;
    })).toBe(true);
    if (scrollAway) {
      await page.mouse.move(1250, 500);
      await page.mouse.wheel(0, -5000);
      await expect.poll(() => button.evaluate((element) => element.getBoundingClientRect().top > innerHeight)).toBe(true);
    }
    release();
    await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
    await expect(button).toBeFocused();
    await expect.poll(() => button.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2) === element;
    })).toBe(!scrollAway);
  });
}
