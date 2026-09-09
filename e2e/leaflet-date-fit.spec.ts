import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

// Keep actual Leaflet code and its first-view/layer lifecycle. Only data, map
// configuration and image/tile requests use existing trusted test fixtures.
const places = plan.places.map((place, index) => ({
  ...place,
  image: "https://wave.test/museum.svg",
  mapX: index === 0 ? "128.675316809542" : "128.7169422954",
  mapY: index === 0 ? "35.3138095252897" : "35.3562997192",
}));

async function readGeometry(page: Page, expectedIds: string[]) {
  return page.evaluate(({ knownPlaces, expectedIds }) => {
    const canvas = document.querySelector<HTMLElement>("#route-map-canvas")!;
    const bounds = canvas.getBoundingClientRect();
    const controls = [...canvas.parentElement!.querySelectorAll<HTMLElement>(".map-command-bar, .map-provider-badge")]
      .map(node => ({ name: node.className, rect: node.getBoundingClientRect().toJSON() }))
      .filter(item => item.rect.width > 0 && item.rect.height > 0);
    const markers = [...canvas.querySelectorAll<HTMLElement>(".wave-map-icon.place")].map(marker => {
      const name = marker.getAttribute("title");
      const id = knownPlaces.find(place => place.name === name)?.id || "unknown:" + name;
      const parts = [marker, ...marker.querySelectorAll<HTMLElement>(".photo-pin, .photo-pin b")].map(node => ({
        kind: node === marker ? "marker" : node.tagName === "B" ? "rank" : "photo",
        rect: node.getBoundingClientRect().toJSON(),
      }));
      return { id, name, parts };
    });
    const issues: string[] = [];
    const actualIds = markers.map(marker => marker.id).sort();
    if (JSON.stringify(actualIds) !== JSON.stringify([...expectedIds].sort())) issues.push("selected-day marker IDs differ: " + JSON.stringify(actualIds));
    for (const marker of markers) {
      if (!marker.parts.some(part => part.kind === "photo") || !marker.parts.some(part => part.kind === "rank")) issues.push(marker.id + ": photo/rank missing");
      for (const part of marker.parts) {
        const rect = part.rect;
        if (rect.width <= 0 || rect.height <= 0 || rect.left < bounds.left || rect.right > bounds.right || rect.top < bounds.top || rect.bottom > bounds.bottom) {
          issues.push(marker.id + " " + part.kind + ": outside canvas");
        }
        for (const control of controls) {
          const overlapWidth = Math.max(0, Math.min(rect.right, control.rect.right) - Math.max(rect.left, control.rect.left));
          const overlapHeight = Math.max(0, Math.min(rect.bottom, control.rect.bottom) - Math.max(rect.top, control.rect.top));
          if (overlapWidth * overlapHeight > 0) issues.push(marker.id + " " + part.kind + ": overlaps " + control.name + " by " + overlapHeight + "px vertically");
        }
      }
    }
    return { issues, markers, controls, canvas: bounds.toJSON(), selectedDay: document.querySelector(".itinerary-day-tabs button[aria-pressed=true]")?.textContent, viewport: { width: innerWidth, height: innerHeight } };
  }, { knownPlaces: places.map(({ id, name }) => ({ id, name })), expectedIds });
}

async function assertSettledMarkers(page: Page, info: TestInfo, label: string, expectedIds: string[]) {
  const canvas = page.locator("#route-map-canvas");
  await expect(page.locator(".map-provider-badge.osm")).toBeVisible();
  await expect(canvas).toHaveClass(/leaflet-container/);
  await canvas.scrollIntoViewIfNeeded();
  let previous = "", stableSamples = 0;
  try {
    await expect.poll(async () => {
      const state = await readGeometry(page, expectedIds);
      const signature = JSON.stringify(state.markers);
      stableSamples = signature === previous ? stableSamples + 1 : 1;
      previous = signature;
      return { issues: state.issues, settled: stableSamples >= 3 };
    }, { message: label + ": full photo/rank must remain inside the real Leaflet canvas and clear of map controls" }).toEqual({ issues: [], settled: true });
  } finally {
    await info.attach(label + "-geometry", { body: JSON.stringify(await readGeometry(page, expectedIds), null, 2), contentType: "application/json" });
    await page.screenshot({ path: info.outputPath(label + ".png") });
  }
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`real Leaflet keeps dated photo markers clear through day changes and mobile resize: ${reducedMotion}`, async ({ page }, info) => {
    const pageErrors: { message: string; stack?: string; at: string }[] = [];
    page.on("pageerror", error => pageErrors.push({ message: error.message, stack: error.stack, at: new Date().toISOString() }));
    try {
      const escapedRequests: string[] = [];
      const localOrigin = new URL(info.project.use.baseURL as string).origin;
      // Registered first, so the existing fixture routes below take precedence.
      // Any unmatched API or external request is blocked instead of hitting a provider.
      await page.route("**/*", route => {
        const request = route.request(), url = new URL(request.url());
        if (["GET", "HEAD"].includes(request.method()) && url.origin === localOrigin && !url.pathname.startsWith("/api/")) return route.continue();
        escapedRequests.push(request.method() + " " + url.origin + url.pathname);
        return route.abort("blockedbyclient");
      });
      await mockPlannerApi(page, { crowdRate: 80 });
      // The actual region chooser now renders an official destination photo.
      // Keep this Leaflet geometry test fully local, including that new image.
      await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({
        status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#315b63"/></svg>',
      }));
      await page.route("**/api/wave?action=plan**", route => route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ ...plan, places, crowd: { ...plan.crowd, rate: 80 }, stops: plan.stops.map((stop, index) => ({ ...stop, mapX: places[index].mapX, mapY: places[index].mapY })) }),
      }));
      // Explicit empty key chooses real Leaflet; no window.kakao/Leaflet adapter.
      await page.route("**/api/map-config", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ javascriptKey: "" }) }));
      await page.emulateMedia({ reducedMotion });
      await page.setViewportSize({ width: 1366, height: 900 });
      const format = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
      const today = format(new Date()), tomorrow = format(new Date(Date.now() + 86400000));
      await page.goto("/planner?travelStart=" + today + "&travelEnd=" + tomorrow);
      await chooseTripConditions(page);
      for (const place of places) await page.getByRole("button", { name: place.name + " 일정에 추가", exact: true }).click();
      await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]").sort())).toEqual(["1001", "1002"]);
      await assertSettledMarkers(page, info, "1366-two-places", ["1001", "1002"]);
      expect(pageErrors, "initial real Leaflet fitting must not throw").toEqual([]);
      await page.getByLabel(places[1].name + " 여행 날짜", { exact: true }).selectOption(tomorrow);
      const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
      await expect(itinerary.getByLabel(places[0].name + " 여행 날짜", { exact: true })).toHaveValue(today);
      await expect(itinerary.getByLabel(places[1].name + " 여행 날짜", { exact: true })).toHaveValue(tomorrow);
      for (const width of [1366, 390]) {
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        // Exercise repeated replacements while a transition may be pending;
        // the original settled checks for BOTH days still follow.
        for (let cycle = 0; cycle < 2; cycle++) {
          for (const date of [tomorrow, today]) {
            await page.locator(".itinerary-day-tabs").getByRole("button", { name: date.slice(5).replace("-", "/"), exact: true }).click();
          }
        }
        for (const [date, id] of [[tomorrow, "1002"], [today, "1001"]]) {
          const day = date.slice(5).replace("-", "/");
          const tab = page.locator(".itinerary-day-tabs").getByRole("button", { name: day, exact: true });
          await tab.click();
          await expect(tab).toHaveAttribute("aria-pressed", "true");
          await assertSettledMarkers(page, info, width + "-" + id + "-day-map", [id]);
          expect(pageErrors, "dated map replacement must not leave a failing SDK animation").toEqual([]);
        }
      }
      expect(await page.evaluate(() => Boolean(window.kakao?.maps))).toBe(false);
      expect(escapedRequests, "all APIs and tile/image requests must be fulfilled by local test fixtures").toEqual([]);
      expect(pageErrors).toEqual([]);
    } finally {
      await info.attach("leaflet-page-errors", { body: JSON.stringify({ reducedMotion, pageErrors }, null, 2), contentType: "application/json" });
    }
  });
}
