import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

const forecast = {
  region: "창원", updatedAt: "2026-09-06T02:00:00Z", source: "Open-Meteo",
  current: { temperature: 0, apparent: -2, code: 999, label: "날씨 정보 미확인", wind: 0, precipitation: 0, isDay: true },
  days: [{ date: "2026-09-01", code: 71, label: "눈", max: 3, min: -2, rainProbability: 0, rain: 0, snow: 1.2, uv: 0, advice: [] }],
  advice: ["눈 예보가 있어 방수 신발과 보온 장갑이 좋아요."],
};

async function prepare(page: Page, english = false) {
  await mockPlannerApi(page);
  await page.addInitScript((en) => localStorage.setItem("wave-locale", en ? "en" : "ko"), english);
  await page.emulateMedia({ reducedMotion: "reduce" });
}

test("departure weather evidence opens the forecast with pointer and keyboard without another request", async ({ page }) => {
  await prepare(page);
  let weatherRequests = 0;
  await page.route("**/api/weather**", (route) => {
    weatherRequests++;
    return route.fulfill({ json: { ...forecast, days: Array.from({ length: 7 }, (_, index) => ({ ...forecast.days[0], date: `2026-09-0${index + 1}` })) } });
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const savedPlace = page.getByRole("button", { name: "경남도립미술관 일정에서 빼기", exact: true });
  const weatherCard = page.locator(".readiness-grid article").filter({ has: page.getByText("날씨", { exact: true }) });
  await expect(weatherCard).toContainText("해당 날짜 예보가 없거나 예보 범위 밖입니다.");
  const evidence = weatherCard.getByRole("link", { name: "바로 확인하기", exact: true });
  const panel = page.locator("#layers");
  const board = page.locator(".weather-board");
  await expect(panel).toHaveJSProperty("open", false);
  await expect(board).toHaveCount(0);
  const requestsBefore = weatherRequests;

  await evidence.click();
  await expect(panel).toHaveJSProperty("open", true);
  await expect(board).toBeVisible();
  await expect(board).toContainText("체감 -2°");
  await expect(page).toHaveURL(/#layers$/);
  await expect(panel.locator("summary")).toBeFocused();
  await expect(savedPlace).toHaveAttribute("aria-pressed", "true");

  // Repeat from a closed panel with the same hash: no hashchange event is required.
  await panel.locator("summary").click();
  await expect(panel).toHaveJSProperty("open", false);
  await expect(board).toHaveCount(0);
  await evidence.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toHaveJSProperty("open", true);
  await expect(board).toBeVisible();
  await expect(board).toHaveAccessibleName("창원 여행 날씨");
  await expect(page).toHaveURL(/#layers$/);
  await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest("#layers")))).toBe(true);
  await expect(panel.locator("summary")).toBeFocused();
  await expect.poll(() => panel.locator("summary").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return rect.top >= 0 && rect.bottom <= innerHeight && Boolean(hit && element.contains(hit));
  })).toBe(true);
  await expect(savedPlace).toHaveAttribute("aria-pressed", "true");
  expect(weatherRequests).toBe(requestsBefore);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: test.info().outputPath("departure-weather-evidence.png") });
});

test("weather language changes keep the same forecast without another request", async ({ page }) => {
  await prepare(page, true);
  let requests = 0;
  await page.route("**/api/weather**", (route) => { requests++; return route.fulfill({ json: forecast }); });
  const board = await openWeather(page, true);
  await expect(board).toContainText("Feels like -2°");
  const before = requests;
  await page.keyboard.press("Control+Home");
  const preferences = page.locator(".preference-controls:visible");
  await preferences.getByLabel("Open preferences", { exact: true }).click();
  await preferences.getByLabel("Language", { exact: true }).selectOption("ko");
  await expect(board).toContainText("체감 -2°");
  await preferences.getByLabel("언어", { exact: true }).selectOption("en");
  await expect(board).toContainText("Feels like -2°");
  expect(requests).toBe(before);
});

for (const theme of ["light", "dark"] as const) {
  test(`weather ${theme} remains readable with a keyboard at all required viewport widths`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await prepare(page, true);
    await page.addInitScript((value) => localStorage.setItem("wave-theme", value), theme);
    const days = Array.from({ length: 7 }, (_, index) => ({ ...forecast.days[0], date: `2026-09-0${index + 1}` }));
    await page.route("**/api/weather**", (route) => route.fulfill({ json: { ...forecast, days } }));
    const board = await openWeather(page, true);
    for (const [width, height] of [[320,568], [360,640], [390,844], [430,932], [768,1024], [1024,768], [1280,720], [1366,768], [1440,900], [1920,1080], [2560,1440]]) {
      await page.setViewportSize({ width, height });
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await expect(board.locator('.sr-only[role="status"]')).toHaveText("Forecast received.");
      expect(await board.locator("p:not(.sr-only),li,small").evaluateAll((elements) => elements.filter((element) => element.scrollWidth > element.clientWidth).map((element) => ({ text: element.textContent, available: element.clientWidth, required: element.scrollWidth })))).toEqual([]);
      const retry = board.getByRole("button", { name: "Check weather again", exact: true });
      const box = await retry.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
      await retry.focus();
      await expect.poll(() => retry.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return rect.top >= 0 && rect.bottom <= innerHeight && Boolean(hit && element.contains(hit));
      })).toBe(true);
      expect((await new AxeBuilder({ page }).include(".weather-board").include(".impact-response").analyze()).violations).toEqual([]);
      if ([390, 1366].includes(width)) await page.screenshot({ path: test.info().outputPath(`weather-${theme}-${width}.png`) });
    }
    const daily = board.getByRole("region", { name: "Daily forecast, scroll for more days", exact: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await daily.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => daily.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
}

async function openWeather(page: Page, english = false) {
  await page.goto("/planner");
  if (english) {
    await page.getByRole("button", { name: "Changwon", exact: true }).click();
    await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
    await page.getByRole("button", { name: /Nature and relaxation/ }).click();
    await page.getByRole("button", { name: "Find places →", exact: true }).click();
  } else await chooseTripConditions(page);
  await page.getByRole("button", { name: english ? "View weather and visitor forecasts" : "날씨·방문 경향 바로 확인하기", exact: true }).click();
  return page.locator(".weather-board");
}

test("English weather preserves unknown conditions, zero readings and actual forecast dates", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await prepare(page, true);
  await page.route("**/api/weather**", (route) => route.fulfill({ json: forecast }));
  const board = await openWeather(page, true);
  await expect(board).toHaveAccessibleName("Changwon travel weather");
  await expect(board).toContainText("Weather condition unknown");
  await expect(board).toContainText("Feels like -2°");
  await expect(board).toContainText("Snow 1.2 cm");
  await expect(board.locator('time[datetime="2026-09-01"]')).toBeVisible();
  await expect(board).not.toContainText("Today");
  await expect(board).not.toContainText("오늘");
  await expect(board).not.toContainText("눈 예보");
  await expect(page.locator(".impact-response")).toContainText("Current conditions only");
  await expect(page.locator(".impact-response")).toContainText("not an exact live visitor count");
  expect(errors).toEqual([]);
});

test("the weather view loads on demand and a failed module leaves the itinerary usable", async ({ page }) => {
  await prepare(page, true);
  let modules = 0;
  await page.route("**/WeatherBoard.tsx*", (route) => { modules++; return route.abort(); });
  await page.goto("/planner");
  expect(modules).toBe(0);
  await page.getByRole("button", { name: "Changwon", exact: true }).click();
  await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
  await page.getByRole("button", { name: /Nature and relaxation/ }).click();
  await page.getByRole("button", { name: "Find places →", exact: true }).click();
  await page.getByRole("button", { name: "경남도립미술관 Add to itinerary", exact: true }).click();
  expect(modules).toBe(0);
  await page.getByRole("button", { name: "View weather and visitor forecasts", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "The weather view could not open" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload this page", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "경남도립미술관 Remove from itinerary", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(modules).toBeGreaterThan(0);
});

for (const kind of ["http", "malformed"] as const) {
  test(`weather ${kind} failure offers an independent retry without losing the itinerary`, async ({ page }) => {
    await prepare(page);
    await page.route("**/api/weather**", (route) => route.fulfill({ status: kind === "http" ? 503 : 200, json: kind === "http" ? { error: "unavailable" } : { current: null, days: [] } }));
    const board = await openWeather(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    await expect(board).toContainText("예보를 잠시 불러오지 못했습니다.");
    const retry = board.getByRole("button", { name: "날씨 다시 확인", exact: true });
    await expect(retry).toBeVisible();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    let count = 0;
    await page.route("**/api/weather**", async (route) => { count++; await hold; await route.fulfill({ json: forecast }); });
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(retry).toHaveAttribute("aria-busy", "true");
    await expect(retry).toBeFocused();
    await page.keyboard.press("Enter");
    release();
    await expect(board).toContainText("체감 -2°");
    await expect(retry).toBeFocused();
    expect(count).toBe(1);
    const saved = page.getByRole("button", { name: "경남도립미술관 일정에서 빼기", exact: true });
    await expect(saved).toBeVisible();
    await expect(saved).toHaveAttribute("aria-pressed", "true");
  });
}
