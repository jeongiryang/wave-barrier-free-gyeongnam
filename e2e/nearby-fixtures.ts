import { expect, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

export interface NearbyFixturePlace { id: string; place_name: string; address_name: string; road_address_name: string; x: string; y: string; distance: string; place_url: string }
interface NearbyFixture {
  requests: { code: string; callback: (places: unknown, status: string) => void }[];
  throwNext: boolean;
}
export interface MapLayerFixture { maps: { base: number; layers: number[] }[]; failBase: boolean; failLayer: boolean }
export function nearbyPlace(index = 1): NearbyFixturePlace {
  return { id: String(index), place_name: `검증 장소 ${index}`, address_name: "경남 창원시", road_address_name: "", x: "128.68", y: "35.23", distance: String(index * 10), place_url: `https://place.map.kakao.com/${index}` };
}
export async function nearbyRequests(page: Page) {
  return page.evaluate(() => (window as unknown as { nearbyFixture: NearbyFixture }).nearbyFixture.requests.length);
}
export async function deliverNearby(page: Page, index: number, status: string, places: unknown = []) {
  await page.evaluate(({ index, status, places }) => (window as unknown as { nearbyFixture: NearbyFixture }).nearbyFixture.requests[index].callback(places, status), { index, status, places });
}
export async function openNearby(page: Page, english = false, theme = "light", placeCoordinate?: { mapX: string; mapY: string }) {
  await mockPlannerApi(page, { placeCoordinate });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((theme) => {
    localStorage.setItem("wave-theme", theme);
    const noop = () => undefined;
    const state: NearbyFixture = { requests: [], throwNext: false };
    const layerState: MapLayerFixture = { maps: [], failBase: false, failLayer: false };
    Object.assign(window, { nearbyFixture: state, mapLayerFixture: layerState });
    class Overlay { setMap = noop; }
    class LatLng { constructor(private lat: number, private lng: number) {} getLat() { return this.lat; } getLng() { return this.lng; } }
    const maps = {
      load: (callback: () => void) => callback(), LatLng, LatLngBounds: class { extend = noop; },
      Map: class {
        base = 1; layers: number[] = [];
        constructor() { layerState.maps.push(this); }
        setBounds = noop; setCenter = noop; panTo = noop; setLevel = noop; relayout = noop; setMaxLevel = noop;
        getLevel() { return 9; }
        getBounds() { return { getSouthWest: () => new LatLng(35.1, 128.5), getNorthEast: () => new LatLng(35.4, 128.9) }; }
        getCenter() { return new LatLng(35.23, 128.68); }
        setMapTypeId(id: number) { if (layerState.failBase) throw Error("controlled map-type failure"); this.base = id; }
        addOverlayMapTypeId(id: number) { if (layerState.failLayer) throw Error("controlled overlay failure"); this.layers = [...new Set([...this.layers, id])]; }
        removeOverlayMapTypeId(id: number) { if (layerState.failLayer) throw Error("controlled overlay failure"); this.layers = this.layers.filter((value) => value !== id); }
      },
      Marker: Overlay, CustomOverlay: Overlay, Polyline: Overlay, Circle: Overlay,
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
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
  if (english) {
    await page.keyboard.press("Control+Home");
    const preferences = page.locator(".preference-controls:visible");
    await preferences.getByLabel("환경설정 열기", { exact: true }).click();
    await preferences.getByLabel("언어", { exact: true }).selectOption("en");
    await preferences.getByLabel("Open preferences", { exact: true }).click();
  }
  await page.getByRole("button", { name: english ? "Map options" : "지도 도구", exact: true }).click();
  await page.locator('.map-command-bar button[aria-controls="map-panel-nearby"]').click();
  const panel = page.getByRole("region", { name: english ? "Find nearby places" : "주변 장소 찾기", exact: true });
  await expect(panel).toBeVisible();
  expect(await nearbyRequests(page)).toBe(0);
  return panel;
}
