import { openNaruTool, closeNaruTool, naruDialog } from "./naru-tool-fixtures";
import { openSupportMenu } from "./support-menu";
import { expect, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, openItinerary } from "./fixtures";

export interface NearbyFixturePlace { id: string; place_name: string; address_name: string; road_address_name: string; x: string; y: string; distance: string; place_url: string }
interface NearbyFixture {
  requests: { code: string; callback: (places: unknown, status: string) => void }[];
  throwNext: boolean;
}
export interface MapLayerFixture { maps: { base: number; layers: number[] }[]; failBase: boolean; failLayer: boolean }
export interface MapRenderFixture {
  overlays: Array<{ kind: string; map: unknown; options: Record<string, unknown> }>;
  viewportChanges: Array<{ kind: string; map: unknown }>;
}
export function nearbyPlace(index = 1): NearbyFixturePlace {
  return { id: String(index), place_name: `검증 장소 ${index}`, address_name: "경남 창원시", road_address_name: "", x: "128.68", y: "35.23", distance: String(index * 10), place_url: `https://place.map.kakao.com/${index}` };
}
export async function nearbyRequests(page: Page) {
  return page.evaluate(() => (window as unknown as { nearbyFixture: NearbyFixture }).nearbyFixture.requests.length);
}
export async function deliverNearby(page: Page, index: number, status: string, places: unknown = []) {
  await expect.poll(() => page.evaluate(index => typeof (window as unknown as { nearbyFixture: NearbyFixture }).nearbyFixture.requests[index]?.callback, index), { message: `Nearby request ${index} must exist before its response is delivered` }).toBe("function");
  await page.evaluate(({ index, status, places }) => (window as unknown as { nearbyFixture: NearbyFixture }).nearbyFixture.requests[index].callback(places, status), { index, status, places });
}
export async function openNearby(page: Page, english = false, theme = "light", placeCoordinate?: { mapX: string; mapY: string }, beforeNavigation?: () => Promise<void>) {
  await mockPlannerApi(page, { placeCoordinate, preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((theme) => {
    localStorage.setItem("wave-theme", theme);
    const noop = () => undefined;
    const state: NearbyFixture = { requests: [], throwNext: false };
    const layerState: MapLayerFixture = { maps: [], failBase: false, failLayer: false };
    const renderState: MapRenderFixture = { overlays: [], viewportChanges: [] };
    Object.assign(window, { nearbyFixture: state, mapLayerFixture: layerState, mapRenderFixture: renderState });
    class Overlay {
      record: MapRenderFixture["overlays"][number];
      constructor(kind: string, options: Record<string, unknown> = {}) {
        this.record = { kind, map: options.map, options };
        renderState.overlays.push(this.record);
      }
      setMap(map: unknown) { this.record.map = map; }
    }
    class LatLng { constructor(private lat: number, private lng: number) {} getLat() { return this.lat; } getLng() { return this.lng; } }
    const maps = {
      load: (callback: () => void) => callback(), LatLng, LatLngBounds: class { extend = noop; },
      Map: class {
        base = 1; layers: number[] = [];
        constructor() { layerState.maps.push(this); }
        setBounds = () => { renderState.viewportChanges.push({ kind: "setBounds", map: this }); };
        setCenter = () => { renderState.viewportChanges.push({ kind: "setCenter", map: this }); };
        panTo = () => { renderState.viewportChanges.push({ kind: "panTo", map: this }); };
        setLevel = noop; relayout = noop; setMaxLevel = noop;
        getLevel() { return 9; }
        getBounds() { return { getSouthWest: () => new LatLng(35.1, 128.5), getNorthEast: () => new LatLng(35.4, 128.9) }; }
        getCenter() { return new LatLng(35.23, 128.68); }
        setMapTypeId(id: number) { if (layerState.failBase) throw Error("controlled map-type failure"); this.base = id; }
        addOverlayMapTypeId(id: number) { if (layerState.failLayer) throw Error("controlled overlay failure"); this.layers = [...new Set([...this.layers, id])]; }
        removeOverlayMapTypeId(id: number) { if (layerState.failLayer) throw Error("controlled overlay failure"); this.layers = this.layers.filter((value) => value !== id); }
      },
      Marker: class extends Overlay { constructor(options?: Record<string, unknown>) { super("Marker", options); } },
      CustomOverlay: class extends Overlay { constructor(options?: Record<string, unknown>) { super("CustomOverlay", options); } },
      Polyline: class extends Overlay { constructor(options?: Record<string, unknown>) { super("Polyline", options); } },
      Circle: class extends Overlay { constructor(options?: Record<string, unknown>) { super("Circle", options); } },
      Roadview: class { setPanoId = noop; relayout = noop; },
      RoadviewClient: class { getNearestPanoId(_p: unknown, _r: number, callback: (id: number | null) => void) { callback(null); } },
      MapTypeId: { ROADMAP: 1, SKYVIEW: 2, HYBRID: 3, TRAFFIC: 4, TERRAIN: 5, BICYCLE: 6, BICYCLE_HYBRID: 7, USE_DISTRICT: 8 },
      event: { addListener: noop },
      services: { Places: class {
        categorySearch(code: string, callback: (places: unknown, status: string) => void) { if (state.throwNext) { state.throwNext = false; throw Error("controlled SDK exception"); } state.requests.push({ code, callback }); }
        keywordSearch(code: string, callback: (places: unknown, status: string) => void) { this.categorySearch(code, callback); }
      }, Status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" }, SortBy: { DISTANCE: "DISTANCE" } },
    };
    Object.defineProperty(window, "kakao", { value: { maps }, writable: true });
  }, theme);
  await page.route("**/api/map-config", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ provider: "kakao", javascriptKey: "e2e-stub-key" }) }));
  await beforeNavigation?.();
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openPlannerMap(page);
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
  if (english) await changeMapLanguage(page, true);
  await page.getByRole("button", { name: english ? "Map options" : "지도 도구", exact: true }).click();
  await page.locator('.map-command-bar button[aria-controls="map-panel-nearby"]').click();
  const panel = page.getByRole("region", { name: english ? "Find nearby places" : "주변 장소 찾기", exact: true });
  await expect(panel).toBeVisible();
  expect(await nearbyRequests(page)).toBe(0);
  return panel;
}


/** Enter the dated itinerary and use the real mobile time/map switch when shown. */
export async function openPlannerMap(page: Page, dates = { start: "2026-10-08" } as { start: string; end?: string }) {
  await openItinerary(page, dates);
  await ensureMapView(page);
}
export async function ensureMapView(page: Page) {
  const controls = page.getByRole("group", { name: "일정 보기 방식", exact: true });
  // Resizing commits the media-query layout asynchronously. Require the current
  // layout before deciding whether the real timetable/map switch is available.
  if (await page.evaluate(() => matchMedia("(min-width:1024px)").matches)) {
    await expect(controls).toHaveCount(0);
  } else {
    await expect(controls).toBeVisible();
    const toggle = controls.getByRole("button", { name: "지도", exact: true });
    if (await toggle.getAttribute("aria-pressed") !== "true") await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
  }
  await expect(page.locator("#navigation")).toBeVisible();
}
export async function openRouteDetails(page: Page) {
  for (const selector of [".reference-route-details"]) {
    const details = page.locator(selector);
    if (await details.getAttribute("open") === null) await details.locator(":scope > summary").click();
  }
}
export async function changeMapLanguage(page: Page, english: boolean) {
  await page.keyboard.press("Control+Home");
  await openSupportMenu(page);
  const preferences = page.locator(".preference-controls:visible");
  if (await preferences.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ }).getAttribute('aria-expanded') !== 'true') await preferences.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ }).click();
  await preferences.getByRole("combobox", { name: /^(언어|Language)$/ }).selectOption(english ? "en" : "ko");
  await preferences.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ }).click();
  await page.getByRole('button', { name: /^(WAVE 이용 안내 메뉴|WAVE support menu)$/ }).click();
}
export async function addAnotherMapPlace(page: Page, name = "용지호수공원") {
  await page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: "여행지 찾기", exact: true }).click();
  const refresh = page.getByRole("button", { name: /^(현재 조건으로 다시 찾기|Search current preferences)$/ });
  if (await refresh.count()) await refresh.click();
  await page.getByRole("button", { name: new RegExp("^" + name + " (일정에 담기|add to itinerary)$") }).click();
  await openPlannerMap(page);
}
export async function openMapTool(page: Page, tool: "nearby" | "layers" | "export" | "route") {
  const panel = page.locator("#map-panel-" + tool);
  if (await panel.isVisible()) return panel;
  const trigger = page.locator('.map-command-bar button[aria-controls="map-panel-' + tool + '"]');
  if (!await trigger.isVisible()) await page.getByRole("button", { name: /^(지도 도구|Map options)$/ }).click();
  await trigger.click();
  await expect(panel).toBeVisible();
  return panel;
}

/** The same live route state is inspected through Naru, then the map regains input. */
export async function withRouteCoverage(page: Page, action: () => Promise<void> = async () => {}) {
  await openNaruTool(page, '이동 구간 확인');
  await expect(page.locator('.itinerary-route-coverage')).toBeVisible();
  await action();
  if (await naruDialog(page).isVisible()) await closeNaruTool(page);
}
