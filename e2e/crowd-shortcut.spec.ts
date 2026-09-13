import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";

async function makeItinerary(page: Page) {
  await page.goto("/planner");
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  // The selected first leg starts its destination forecast only once dated.
  const initialCrowdResponse = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/wave" && url.searchParams.get("action") === "crowd"
      && url.searchParams.get("region") === "창원" && url.searchParams.get("title") === "경남도립미술관";
  });
  await openItinerary(page, { start: "2026-09-14", end: "2026-09-14" });
  const initialCrowd = await initialCrowdResponse;
  expect(initialCrowd.ok()).toBe(true);
  await initialCrowd.finished();
  await expect(page.locator(".itinerary-route-coverage .coverage-notice")).toContainText("조회가 끝났습니다.");
  await expect(page.locator(".itinerary-route-coverage .coverage-actions > button")).toHaveAttribute("aria-busy", "false");
  await page.locator(".simple-departure > summary").click();
}

for (const input of ["pointer", "keyboard"] as const) {
  test(`${input}: visitor forecast shortcut opens current evidence without another search or forecast`, async ({ page, isMobile }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPlannerApi(page, { crowdRate: 65 });
    await mockPublicShellApi(page);
    const crowdRequests: string[] = [];
    const planRequests: string[] = [];
    page.on("request", request => {
      const url = new URL(request.url());
      if (url.pathname !== "/api/wave") return;
      if (url.searchParams.get("action") === "crowd") crowdRequests.push(`${url.searchParams.get("region")}:${url.searchParams.get("title")}`);
      if (url.searchParams.get("action") === "plan") planRequests.push(url.searchParams.get("region") || "");
    });
    await makeItinerary(page);
    expect(crowdRequests).toEqual(["창원:경남도립미술관"]);
    expect(planRequests).toEqual(["창원"]);
    const crowdRow = page.locator(".simple-readiness > details").filter({ has: page.locator("summary > strong").filter({ hasText: /^관광 집중률$/ }) });
    await crowdRow.locator("summary").click();
    const shortcut = crowdRow.getByRole("link", { name: "상세 정보 확인 →", exact: true });
    await expect(page.locator("#layers")).not.toHaveAttribute("open");
    if (input === "pointer") await shortcut.click();
    else { await shortcut.focus(); await page.keyboard.press("Enter"); }
    const heading = page.locator(".impact-response h3");
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    await expect(page.locator(".impact-response")).toContainText("관광 집중률 예측");
    await expect(page).toHaveURL(/#crowd$/);
    await page.locator("#layers > summary").click();
    await expect(page.locator("#layers")).not.toHaveAttribute("open");
    await shortcut.focus();
    await page.keyboard.press("Enter");
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    expect(crowdRequests).toEqual(["창원:경남도립미술관"]);
    expect(planRequests).toEqual(["창원"]);
    await page.locator("#layers > summary").click();
    await page.goBack();
    await page.goForward();
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    for (const width of isMobile ? [390, 320] : [960, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await heading.focus();
      await expect(page.locator(".impact-response")).toHaveCSS("opacity", "1");
      await page.locator(".impact-response").screenshot({ path: test.info().outputPath(`crowd-shortcut-${width}.png`) });
    }
    await page.locator("#layers > summary").click();
    const weatherRow = page.locator(".simple-readiness > details").filter({ has: page.locator("summary > strong").filter({ hasText: /^날씨$/ }) });
    await weatherRow.locator("summary").click();
    await weatherRow.getByRole("link", { name: "상세 정보 확인 →", exact: true }).click();
    await expect(page.locator("#layers > summary")).toBeFocused();
    await expect(page).toHaveURL(/#layers$/);
    expect(crowdRequests).toEqual(["창원:경남도립미술관"]);
    expect(planRequests).toEqual(["창원"]);
  });
}

test("a restored itinerary hash preserves its unavailable forecast and shortcuts do not retry a failed automatic search", async ({ page }) => {
  await mockPlannerApi(page, { crowdRate: 65 });
  await mockPublicShellApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await makeItinerary(page);
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values);
  let searches = 0;
  await page.route("**/api/wave?*", route => {
    if (new URL(route.request().url()).searchParams.get("action") !== "plan") return route.fallback();
    searches++;
    return route.fulfill({ status: 503, json: { error: "합성 제공처 연결 실패" } });
  });
  const automatic = page.waitForResponse(response => new URL(response.url()).searchParams.get("action") === "plan");
  await page.goto("/planner#crowd");
  await (await automatic).finished();
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("#layers")).toHaveAttribute("open");
  await expect(page.locator("#crowd")).toContainText("현재 일정의 관광 집중률은 아직 조회하지 않았습니다.");
  await expect(page.locator("#crowd")).not.toContainText("65.0%");
  expect(searches).toBe(1);
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values);
  expect(restored["wave-saved-places"]).toEqual(before["wave-saved-places"]);
  expect(restored["wave-trip-schedule-v1"]).toEqual(before["wave-trip-schedule-v1"]);
  await page.locator("#layers > summary").click();
  const crowdRow = page.locator(".simple-readiness > details").filter({ has: page.locator("summary > strong").filter({ hasText: /^관광 집중률$/ }) });
  await crowdRow.locator("summary").click();
  await crowdRow.getByRole("link").click();
  await expect(page.locator("#crowd h3")).toBeFocused();
  await expect(page.locator("#crowd h3")).toBeInViewport();
  expect(searches).toBe(1);
});
