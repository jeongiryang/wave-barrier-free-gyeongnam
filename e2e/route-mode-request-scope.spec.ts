import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

function bundle(mode: string, label = "fixture journey") {
  return { configured: mode === "car" || mode === "transit", providers: [], context: { nearbyStops: [], arrivals: [], korail: [], catalog: { trainCities: 0, expressTerminals: 0, intercityTerminals: 0 }, datasets: [] },
    alternatives: mode === "car" || mode === "transit" ? [{ id: `${mode}-${label}`, label, provider: mode === "car" ? "Kakao Mobility" : "ODsay", mode,
      configured: true, totalTime: 25, totalDistance: 8800, totalWalk: mode === "car" ? 0 : 300, payment: 0, transfers: 0, segments: [], geometry: [] }] : [],
  };
}

test("selected modes reach the request, and ordinary rendering makes no new route request", async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const calls: URL[] = [];
  await page.route("**/api/route?*", request => {
    const url = new URL(request.request().url()); calls.push(url);
    return request.fulfill({ json: bundle(url.searchParams.get("mode") || "") });
  });
  await page.goto("/planner?travelStart=2026-10-08&travelEnd=2026-10-09");
  await chooseTripConditions(page);
  expect(calls).toHaveLength(0);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const mode = page.locator(".itinerary-route-coverage select");
  await expect(mode).toHaveValue("transit");
  await expect.poll(() => calls.map(url => url.searchParams.get("mode"))).toEqual(["transit"]);
  for (const value of ["car", "walk", "bicycle", "transit"]) {
    const count = calls.length;
    await mode.selectOption(value);
    await expect.poll(() => calls.length).toBe(count + 1);
    expect(calls.at(-1)?.searchParams.get("mode")).toBe(value);
    await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".route-option")).toHaveCount(value === "car" || value === "transit" ? 1 : 0);
  }
  expect(calls.every(url => url.searchParams.get("endLng") === plan.places[0].mapX)).toBe(true);
  await page.getByRole("button", { name: "경남도립미술관 일정에서 제거", exact: true }).scrollIntoViewIfNeeded();
  await page.keyboard.press("Control+Home");
  expect(calls).toHaveLength(5);
  await expect(page.locator(".day-planner-grid li")).toHaveCount(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("switching modes cancels old coverage and cannot restore it by switching back", async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let held = false;
  let release!: () => void;
  const responseGate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/route?*", async request => {
    const mode = new URL(request.request().url()).searchParams.get("mode") || "";
    if (held && mode === "car") await responseGate;
    await request.fulfill({ json: bundle(mode, held ? "old car" : "current journey") }).catch(() => {});
  });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  const coverage = page.locator(".itinerary-route-coverage"), mode = coverage.locator("select");
  await mode.selectOption("car");
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  const check = coverage.getByRole("button", { name: "모든 구간 조회하기", exact: true });
  held = true;
  await check.click();
  await expect(coverage.getByRole("button", { name: "구간 확인 중…", exact: true })).toHaveAttribute("aria-busy", "true");
  await mode.selectOption("walk");
  release(); held = false;
  await expect(coverage.getByRole("status")).toContainText("전체 1구간 중 0구간 확인");
  await expect(page.locator(".route-option")).toHaveCount(0);
  await mode.selectOption("car");
  await expect(coverage.getByRole("status")).toContainText("전체 1구간 중 0구간 확인");
  await expect(check).toHaveAttribute("aria-busy", "false");
  await check.click();
  await expect(coverage.getByRole("status")).toContainText("전체 1구간 중 1구간 확인");
});
