import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

async function prepare(page: Page, en: boolean) {
  await mockPlannerApi(page);
  await page.addInitScript(en => localStorage.setItem("wave-theme", en ? "dark" : "light"), en);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner");
  const initialWeather = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/weather" && url.searchParams.get("region") === "창원";
  });
  await chooseTripConditions(page);
  await initialWeather;
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  if (en) {
    await page.keyboard.press("Control+Home");
    await openSupportMenu(page);
    const preferences = page.locator(".preference-controls:visible");
    await openSupportMenu(page);
    await preferences.getByLabel("환경설정 열기", { exact: true }).click();
    await preferences.getByLabel("언어", { exact: true }).selectOption("en");
    await openSupportMenu(page);
    await preferences.getByLabel("Open preferences", { exact: true }).click();
  }
}

for (const en of [false, true]) test(`${en ? "EN dark" : "KO light"}: a fast place refresh cannot finish the pending weather refresh`, async ({ page }, testInfo) => {
  await prepare(page, en);
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let weatherRequests = 0;
  let planRequests = 0;
  await page.route("**/api/weather?*", async route => { weatherRequests++; await gate; await route.fallback(); });
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/api/wave" && url.searchParams.get("action") === "plan") planRequests++;
  });
  const refresh = page.locator(".readiness-actions button").first();
  try {
    const response = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === "/api/wave" && url.searchParams.get("action") === "plan";
    });
    await refresh.focus();
    await page.keyboard.press("Enter");
    await response;
    await expect(page.locator(".condition-actions").getByRole("button", { name: en ? "Find places →" : "여행지 둘러보기 →", exact: true })).toBeEnabled();
    await expect.poll(() => weatherRequests).toBe(1);
    await expect(refresh).toHaveAttribute("aria-busy", "true");
    await expect(refresh).toHaveAttribute("aria-disabled", "true");
    await expect(refresh).toBeFocused();
    await page.keyboard.press("Enter");
    expect(planRequests).toBe(1);
    expect(weatherRequests).toBe(1);
  } finally { release(); }
  await expect(refresh).toHaveAttribute("aria-busy", "false");
  await expect(refresh).toHaveText(en ? "Refresh places and weather" : "장소·날씨 다시 조회");
  await expect(refresh).toBeFocused();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
  expect((await new AxeBuilder({ page }).include(".departure-readiness").analyze()).violations).toEqual([]);
  if (testInfo.project.name === "desktop-chromium") {
    for (const width of [960, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await page.locator(".departure-readiness").scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`refresh-${en ? "en-dark" : "ko-light"}-${width}.png`) });
    }
  }
});

for (const en of [false, true]) test(`${en ? "EN dark" : "KO light"}: missing facility preferences still refreshes places and weather without adding a filter`, async ({ page }) => {
  await prepare(page, en);
  const facility = page.locator(".profile-grid").getByRole("button", { name: en ? /Wheelchair facilities/ : /휠체어 편의시설/ });
  await facility.click();
  await expect(facility).toHaveAttribute("aria-pressed", "false");
  const refresh = page.locator(".readiness-actions button").first();
  await expect(refresh).toHaveText(en ? "Refresh places and weather" : "장소·날씨 다시 조회");
  const searches: URL[] = [];
  page.on("request", request => {
    const url = new URL(request.url());
    if (url.pathname === "/api/wave" && url.searchParams.get("action") === "plan") searches.push(url);
  });
  const weather = page.waitForResponse(response => new URL(response.url()).pathname === "/api/weather");
  await refresh.click();
  await weather;
  await expect(refresh).toHaveAttribute("aria-busy", "false");
  expect(searches).toHaveLength(1);
  expect(searches[0].searchParams.get("profiles")).toBe("");
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"))).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
});
