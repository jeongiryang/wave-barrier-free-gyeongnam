import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

async function prepare(page: Page, setup?: () => Promise<void>) {
  await mockPlannerApi(page);
  await setup?.();
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

for (const theme of ["light", "dark"] as const) {
  test(`English ${theme} route comparison distinguishes verified times, missing times and original route names`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width: test.info().project.name === "mobile-chromium" ? 390 : 1366, height: 900 });
    await page.addInitScript((value) => localStorage.setItem("wave-theme", value), theme);
    await prepare(page);
    const panel = page.locator(".route-compare-panel");
    const modes = panel.getByRole("group", { name: "Estimated time by travel mode", exact: true });
    await expect(modes).toBeVisible();
    await expect(modes.getByRole("button", { name: /Car/ })).toHaveAttribute("aria-pressed", "true");
    const option = panel.locator(".route-option").first();
    await expect(option.getByText("25 min", { exact: true })).toBeVisible();
    await expect(option.getByText("No toll", { exact: true })).toBeVisible();
    for (const label of ["Estimated time", "Toll", "Transfers", "Walking"]) await expect(option.getByText(label, { exact: true })).toBeVisible();
    await expect(panel).toContainText("original language");
    await expect(option.locator('[lang="ko"]')).not.toHaveCount(0);
    await modes.getByRole("button", { name: /Walking/ }).click();
    await expect(modes.getByRole("button", { name: /Walking/ })).toHaveAttribute("aria-pressed", "true");
    await expect(panel.locator(".route-option")).toHaveCount(0);
    await expect(panel.locator(".route-kakao-fallback")).toContainText("No verified journey time");
    const external = panel.getByRole("link", { name: /Check Walking in Kakao Maps/ });
    await expect(external).toHaveAttribute("target", "_blank");
    await expect(external).toHaveAttribute("href", `https://map.kakao.com/link/by/walk/${encodeURIComponent("창원중앙역")},35.2422,128.6982/${encodeURIComponent("경남도립미술관")},35.238,128.691`);
    await modes.getByRole("button", { name: /Car/ }).click();
    const slower = panel.locator(".route-option").filter({ hasText: "40 min" });
    await slower.focus();
    await page.keyboard.press("Enter");
    await expect(slower).toHaveAttribute("aria-pressed", "true");
    await expect(slower).toBeFocused();
    expect((await new AxeBuilder({ page }).include(".route-compare-panel").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
    await panel.screenshot({ path: test.info().outputPath(`route-${theme}.png`) });
    for (const width of [320, 768, 1024, 1366]) {
      await page.setViewportSize({ width, height: 900 });
      for (const control of await panel.locator("button,a").all()) {
        const box = await control.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      }
      const textFits = await modes.locator("button").evaluateAll((buttons) => buttons.every((button) => {
        const label = button.querySelector("div")!;
        const time = button.querySelector("strong")!;
        return label.scrollWidth <= label.clientWidth && label.getBoundingClientRect().right <= time.getBoundingClientRect().left;
      }));
      expect(textFits).toBe(true);
      expect((await new AxeBuilder({ page }).include(".route-compare-panel").analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await panel.screenshot({ path: test.info().outputPath(`route-${width}-${theme}.png`) });
    }
  });
}

test("route comparison language changes without another route request or changing the selected route", async ({ page }) => {
  let requests = 0;
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/route") requests++; });
  await prepare(page);
  const panel = page.locator(".route-compare-panel");
  await expect(panel.locator(".route-option")).toHaveCount(2);
  await panel.locator(".route-option").last().click();
  const before = requests;
  await page.keyboard.press("Control+Home");
  const preferences = page.locator(".preference-controls:visible");
  await preferences.getByLabel("Open preferences", { exact: true }).click();
  await preferences.getByLabel("Language", { exact: true }).selectOption("ko");
  await expect(panel.getByRole("group", { name: "이동수단별 예상 시간", exact: true })).toBeVisible();
  await expect(panel.locator('.route-option[aria-pressed="true"]')).toContainText("40분");
  await preferences.getByLabel("언어", { exact: true }).selectOption("en");
  await expect(panel.locator('.route-option[aria-pressed="true"]')).toContainText("40 min");
  await expect(panel.locator(".route-notice")).not.toContainText("실제 교통 경로");
  expect(requests).toBe(before);
});

test("unavailable mode times fit narrow columns with a wider fallback font", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await prepare(page);
  await page.addStyleTag({ content: ".route-mode-sections { font-family: monospace !important; }" });
  const metrics = await page.locator(".route-mode-sections button").evaluateAll((buttons) => buttons.map((button) => {
    const label = button.querySelector("div")!;
    const time = button.querySelector("strong")!;
    return { name: label.textContent, labelWidth: label.clientWidth, labelTextWidth: label.scrollWidth, timeWidth: time.clientWidth, timeTextWidth: time.scrollWidth };
  }));
  for (const metric of metrics) {
    expect(metric.labelTextWidth, JSON.stringify(metric)).toBeLessThanOrEqual(metric.labelWidth);
    expect(metric.timeTextWidth, JSON.stringify(metric)).toBeLessThanOrEqual(metric.timeWidth);
  }
});

for (const clipboard of ["missing", "denied", "available"] as const) {
  test(`booking route notice reports ${clipboard} clipboard accurately without claiming the site opened`, async ({ page }) => {
    await page.addInitScript((state) => {
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: state === "missing" ? undefined : {
        writeText: async (text: string) => {
          if (state === "denied") throw new DOMException("Not allowed", "NotAllowedError");
          document.documentElement.dataset.copiedRoute = text;
        },
      } });
    }, clipboard);
    // The official site is outside this test; do not perform a booking or claim it loaded.
    await page.context().route("https://www.korail.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>Booking boundary</title>" }));
    await prepare(page);
    await page.locator(".transport-details summary").click();
    const booking = page.locator('.official-booking-strip a[href="https://www.korail.com/"]');
    await expect(booking).toHaveAttribute("target", "_blank");
    const popup = page.waitForEvent("popup");
    await booking.click();
    await (await popup).close();
    const notice = page.locator(".route-notice");
    await expect(notice).toContainText(clipboard === "available" ? "Departure and destination copied." : "Departure and destination could not be copied.");
    await expect(notice).not.toContainText("opened");
    await expect(notice.locator('[lang="ko"]')).toContainText("경남도립미술관");
    expect(await page.locator("html").getAttribute("data-copied-route")).toBe(clipboard === "available" ? "창원중앙역 → 경남도립미술관" : null);
  });
}

test("a mixed route response does not count straight previews or zero times as confirmed routes", async ({ page }) => {
  await prepare(page, async () => {
    await page.route("**/api/route?**", (route) => route.fulfill({ json: {
      configured: true,
      alternatives: [
        { id: "confirmed", label: "검증 경로", configured: true, mode: "car", totalTime: 25, payment: 0, paymentType: "toll", transfers: 0, totalWalk: 0, segments: [], geometry: [] },
        { id: "preview", label: "직선 연결", configured: false, mode: "walk", totalTime: 10, payment: null, transfers: 0, totalWalk: 0, segments: [], geometry: [] },
        { id: "missing", label: "시간 없음", configured: true, mode: "bicycle", totalTime: 0, payment: null, transfers: 0, totalWalk: 0, segments: [], geometry: [] },
      ], providers: [], context: null,
    } }));
  });
  const panel = page.locator(".route-compare-panel");
  await expect(panel.locator(".route-notice")).toContainText("Compare 1 route with estimated journey times.");
  await expect(panel.locator(".route-option")).toHaveCount(1);
  await panel.getByRole("group", { name: "Estimated time by travel mode", exact: true }).getByRole("button", { name: /Walking/ }).click();
  await expect(panel.locator(".route-option")).toHaveCount(0);
  await expect(panel.locator(".route-kakao-fallback")).toContainText("No verified journey time");
});

test("showing a cached itinerary journey updates its estimate count without another request", async ({ page }) => {
  await prepare(page);
  const panel = page.locator(".route-compare-panel");
  await expect(panel.locator(".route-notice")).toContainText("Compare 2 routes");
  let requests = 0;
  await page.route("**/api/route?**", (route) => {
    requests++;
    return route.fulfill({ json: { configured: true, alternatives: [
      { id: "cached", label: "구간 경로", configured: true, mode: "car", totalTime: 18, payment: null, transfers: 0, totalWalk: 0, segments: [], geometry: [] },
    ], providers: [], context: null } });
  });
  const coverage = page.locator(".itinerary-route-coverage");
  await coverage.getByRole("button", { name: "Check all journeys", exact: true }).click();
  await expect(coverage.getByRole("status")).toContainText("1 of 1 journeys found");
  expect(requests).toBe(1);
  await coverage.getByRole("button", { name: "Show this journey", exact: true }).click();
  await expect(panel.locator(".route-option")).toHaveCount(1);
  await expect(panel.locator(".route-notice")).toContainText("Compare 1 route with estimated journey times.");
  await expect(panel.locator('.route-option[aria-pressed="true"]')).toContainText("18 min");
  expect(requests).toBe(1);
});

function sameModeEstimates(staleId = "zero") {
  const route = { mode: "car", payment: null, transfers: 0, totalWalk: 0, segments: [], geometry: [] };
  return [
    { ...route, id: staleId, label: "Missing time", configured: true, totalTime: 0 },
    { ...route, id: "preview", label: "Straight connection", configured: false, totalTime: 5 },
    { ...route, id: "valid", label: "Confirmed journey", configured: true, totalTime: 25 },
  ];
}

test("same-mode missing times and previews never become the hidden active journey", async ({ page }) => {
  await prepare(page, async () => {
    await page.route("**/api/route?**", (route) => route.fulfill({ json: {
      configured: true, alternatives: sameModeEstimates(), providers: [], context: null,
    } }));
  });
  const panel = page.locator(".route-compare-panel");
  await expect(panel.locator(".route-option")).toHaveCount(1);
  await expect(panel.locator('.route-option[aria-pressed="true"]')).toContainText("Confirmed journey");
  await expect(panel.locator(".route-notice")).toContainText("Compare 1 route");
  await expect(panel.locator(".route-notice .live-dot")).toHaveCount(1);
  await panel.getByRole("group", { name: "Estimated time by travel mode", exact: true }).getByRole("button", { name: /Walking/ }).click();
  await expect(panel.locator(".route-option")).toHaveCount(0);
  await expect(panel.locator(".route-notice .ready-dot")).toHaveCount(1);
  expect((await new AxeBuilder({ page }).include(".route-compare-panel").analyze()).violations).toEqual([]);
});

for (const staleId of ["car-fast", "absent-old-id"]) test(`cached same-mode journeys replace the ${staleId} active choice with a visible estimate`, async ({ page }) => {
  await prepare(page);
  const panel = page.locator(".route-compare-panel");
  await expect(panel.locator('.route-option[aria-pressed="true"]')).toContainText("25 min");
  let requests = 0;
  await page.route("**/api/route?**", (route) => {
    requests++;
    return route.fulfill({ json: { configured: true, alternatives: sameModeEstimates(staleId), providers: [], context: null } });
  });
  const coverage = page.locator(".itinerary-route-coverage");
  await coverage.getByRole("button", { name: "Check all journeys", exact: true }).click();
  await expect(coverage.getByRole("status")).toContainText("1 of 1 journeys found");
  await coverage.getByRole("button", { name: "Show this journey", exact: true }).click();
  await expect(panel.locator(".route-option")).toHaveCount(1);
  await expect(panel.locator('.route-option[aria-pressed="true"]')).toContainText("Confirmed journey");
  await expect(panel.locator(".route-notice .live-dot")).toHaveCount(1);
  expect(requests).toBe(1);
  expect((await new AxeBuilder({ page }).include(".route-compare-panel").analyze()).violations).toEqual([]);
});
