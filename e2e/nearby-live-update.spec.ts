import { expect, test, type Page } from "@playwright/test";
import { plan } from "./fixtures";
import { deliverNearby, nearbyPlace, nearbyRequests, openNearby, type MapLayerFixture, type MapRenderFixture } from "./nearby-fixtures";

type Update = "evidence" | "route" | "crowd";
const updatedPlace = { ...plan.places[0], name: "경남도립미술관 최신 전시관", image: "https://wave.test/museum-updated.svg", checkedAt: "2026-09-14T02:00:00.000Z" };
const geometry = [{ lat: 35.2422, lng: 128.6982 }, { lat: 35.241, lng: 128.695 }, { lat: 35.238, lng: 128.691 }];
const routeBundle = {
  configured: true, providers: [],
  alternatives: [{ id: "late-transit", label: "확인된 대중교통 연결", provider: "ODsay", mode: "transit", configured: true, totalTime: 37, totalDistance: 2800, totalWalk: 300, payment: 1700, transfers: 0, segments: [], geometry }],
  context: { nearbyStops: [], arrivals: [], korail: [], catalog: { trainCities: 0, expressTerminals: 0, intercityTerminals: 0 }, datasets: [] },
};

async function renderSnapshot(page: Page) {
  return page.evaluate(() => {
    const state = window as unknown as { mapLayerFixture: MapLayerFixture; mapRenderFixture: MapRenderFixture };
    const active = state.mapRenderFixture.overlays.filter(overlay => overlay.map === state.mapLayerFixture.maps.at(-1));
    const marker = active.find(overlay => overlay.kind === "CustomOverlay" && (overlay.options.content as HTMLElement)?.dataset.placeId === "1001");
    const content = marker?.options.content as HTMLElement | undefined;
    const line = active.find(overlay => overlay.kind === "Polyline");
    const circle = active.find(overlay => overlay.kind === "Circle");
    return {
      maps: state.mapLayerFixture.maps.length,
      viewportChanges: state.mapRenderFixture.viewportChanges.map(change => change.kind),
      markerTitle: content?.title,
      markerImage: (content?.querySelector(".photo-pin") as HTMLElement | null)?.style.backgroundImage,
      line: line ? { style: line.options.strokeStyle, path: (line.options.path as Array<{ getLat(): number; getLng(): number }>).map(point => ({ lat: point.getLat(), lng: point.getLng() })) } : null,
      circle: circle ? { radius: circle.options.radius, color: circle.options.fillColor } : null,
    };
  });
}

async function finishLayout(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function tripSelection(page: Page) {
  return page.evaluate(() => {
    const record = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "null") as { values: Record<string, string> };
    return Object.fromEntries(["wave-saved-places", "wave-trip-schedule-v1", "wave-trip-order-v1", "wave-planner-region-v1", "wave-trip-identity-v1"].map(key => [key, record.values[key]]));
  });
}

for (const update of ["evidence", "route", "crowd"] as const) for (const completed of [false, true]) {
  test(`late ${update} updates the same map without losing ${completed ? "completed" : "pending"} nearby search`, async ({ page }, info) => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const calls: Record<Update, URL[]> = { evidence: [], route: [], crowd: [] };
    let mapRequests = 0;
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/map-config") mapRequests++; });
    // Install before navigation so the map's initial layout timers are also
    // controlled; installing later leaves an already scheduled native timer.
    await page.clock.install();
    try {
      const panel = await openNearby(page, false, "light", undefined, async () => {
        await page.route("**/api/**", async request => {
          const url = new URL(request.request().url());
          const action = url.searchParams.get("action");
          const kind: Update | undefined = url.pathname === "/api/route" ? "route" : url.pathname === "/api/wave" && action === "places" ? "evidence" : url.pathname === "/api/wave" && action === "crowd" ? "crowd" : undefined;
          if (!kind) return request.fallback();
          calls[kind].push(url);
          if (kind === update) await gate;
          return request.fulfill({ json: kind === "route" ? routeBundle : kind === "crowd" ? { crowd: { ...plan.crowd, rate: update === "crowd" ? 88.1 : 24 } } : { places: [update === "evidence" ? updatedPlace : plan.places[0]], missing: [] } });
        });
      });
      // The selected public leg and automatic itinerary coverage are distinct
      // requests. Hold only one source of late data after both have started.
      await expect.poll(() => calls.route.length).toBe(2);
      await expect.poll(() => calls.evidence.length).toBe(1);
      await expect.poll(() => calls.crowd.length).toBe(1);
      expect(calls.route.map(url => Object.fromEntries(url.searchParams))).toEqual(Array(2).fill({ mode: "transit", startLat: "35.2422", startLng: "128.6982", endLat: "35.238", endLng: "128.691" }));
      expect(calls.evidence[0].searchParams.get("ids")).toBe("1001");
      expect(calls.crowd[0].searchParams.get("title")).toBe(plan.places[0].name);
      if (update !== "route") await expect.poll(async () => (await renderSnapshot(page)).line?.style).toBe("solid");
      if (update !== "crowd") await expect(page.locator(".map-crowd-legend em")).toHaveText("24.0%");
      const food = panel.getByRole("button", { name: "음식점", exact: true });
      await expect(food).toBeEnabled();
      await food.focus(); await page.keyboard.press("Enter");
      await expect.poll(() => nearbyRequests(page)).toBe(1);
      if (completed) {
        await deliverNearby(page, 0, "OK", [nearbyPlace()]);
        await expect(panel.locator("article")).toContainText("검증 장소 1");
      } else await expect(panel.getByRole("status")).toContainText("음식점 검색 중");
      await finishLayout(page);
      // Finish the real 260ms tool-layout debounce before measuring live-data
      // changes. Two animation frames alone do not settle this mobile layout.
      await page.clock.runFor(300);
      const before = await renderSnapshot(page), beforeConfig = mapRequests, trip = await tripSelection(page);
      expect(JSON.parse(trip["wave-saved-places"])).toEqual(["1001"]);
      expect(JSON.parse(trip["wave-trip-schedule-v1"]).travelStart).toBe("2026-10-08");
      if (update === "evidence") expect(before.markerTitle).toContain(plan.places[0].name + " ·");
      if (update === "route") expect(before.line?.style).toBe("shortdash");
      if (update === "crowd") expect(before.circle).toBeNull();
      release();
      // A preserved SDK is insufficient: its actual data overlays must refresh.
      if (update === "evidence") {
        await expect.poll(async () => (await renderSnapshot(page)).markerTitle).toContain(updatedPlace.name);
        expect((await renderSnapshot(page)).markerImage).toContain(updatedPlace.image);
        await expect(page.locator(".simple-stops > li")).toContainText(updatedPlace.name);
      } else if (update === "route") {
        await expect.poll(async () => (await renderSnapshot(page)).line).toEqual({ style: "solid", path: geometry });
        await expect(page.locator(".map-legend")).toContainText("정류장 연결 개요 · 실제 도로선 아님");
      } else {
        await expect(page.locator(".map-crowd-legend em")).toHaveText("88.1%");
        await expect.poll(async () => (await renderSnapshot(page)).circle).toEqual({ radius: 2400, color: "#d93d55" });
      }
      await finishLayout(page);
      await page.clock.runFor(300);
      const after = await renderSnapshot(page);
      await info.attach("late-content-map-observations", { body: JSON.stringify({ update, completed, before, after, mapRequests, beforeConfig }, null, 2), contentType: "application/json" });
      expect(after.maps, "Late content must retain the exact query's SDK instance").toBe(before.maps);
      expect(mapRequests, "Late content does not request another map configuration").toBe(beforeConfig);
      expect(after.viewportChanges, "Metadata, route and crowd updates do not reset the user's viewport").toEqual(before.viewportChanges);
      await expect(food).toBeFocused();
      await expect(food).toHaveAttribute("aria-pressed", "true");
      expect(await nearbyRequests(page)).toBe(1);
      if (!completed) {
        await expect(panel.getByRole("status")).toContainText("음식점 검색 중");
        await deliverNearby(page, 0, "OK", [nearbyPlace()]);
      }
      await expect(panel.locator("article")).toHaveCount(1);
      await expect(panel.locator("article")).toContainText("검증 장소 1");
      await expect(panel.getByRole("link")).toHaveAttribute("href", "https://place.map.kakao.com/1");
      expect(await nearbyRequests(page), "The original result is accepted without a replacement query").toBe(1);
      expect(await tripSelection(page)).toEqual(trip);
      expect(calls.route).toHaveLength(2); expect(calls.evidence).toHaveLength(1); expect(calls.crowd).toHaveLength(1);
      expect(errors).toEqual([]);
      await info.attach("late-content-nearby-preserved", { body: JSON.stringify({ update, completed, before, after, mapRequests, nearbyRequests: await nearbyRequests(page), routeRequests: calls.route.map(url => Object.fromEntries(url.searchParams)) }, null, 2), contentType: "application/json" });
    } finally { release(); }
  });
}
