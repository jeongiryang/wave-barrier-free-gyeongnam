import { expect, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, openItinerary } from "./fixtures";
import { ensureMapView } from "./nearby-fixtures";

export interface FacilityFixturePlace {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
  distance: string;
  place_url: string;
}
interface FacilityFixture {
  requests: { code: string; callback: (places: unknown, status: string) => void }[];
}

export function facilityPlace(code: string, index = 1, name = "검증 장소"): FacilityFixturePlace {
  // 지도 중심(35.23, 128.68) 반경 10km 안에 들어오도록 아주 작은 간격만 준다.
  return {
    id: `${code}-${index}`,
    place_name: `${name} ${index}`,
    address_name: "경남 창원시",
    road_address_name: "",
    x: String(128.68 + index * 0.001),
    y: String(35.23 + index * 0.001),
    distance: String(index * 40),
    place_url: `https://place.map.kakao.com/${index}`,
  };
}

export async function facilityRequests(page: Page) {
  return page.evaluate(() => (window as unknown as { facilityFixture: FacilityFixture }).facilityFixture.requests.map((item) => item.code));
}

/** 특정 분류 코드로 들어온 요청 중 아직 답하지 않은 마지막 것에 응답한다. */
export async function deliverFacility(page: Page, code: string, status: string, places: unknown = []) {
  await expect.poll(
    () => page.evaluate((code) => (window as unknown as { facilityFixture: FacilityFixture }).facilityFixture.requests.filter((item) => item.code === code).length, code),
    { message: `${code} 요청이 있어야 응답할 수 있다` },
  ).toBeGreaterThan(0);
  await page.evaluate(({ code, status, places }) => {
    const state = (window as unknown as { facilityFixture: FacilityFixture }).facilityFixture;
    const request = state.requests.filter((item) => item.code === code).at(-1)!;
    request.callback(places, status);
  }, { code, status, places });
}

/** 편의 표시 패널을 연다. 이 시점까지 어떤 장소 검색 요청도 나가면 안 된다. */
export async function openFacilityPanel(page: Page, english = false) {
  await mockPlannerApi(page, { preserveView: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const noop = () => undefined;
    const state: FacilityFixture = { requests: [] };
    Object.assign(window, { facilityFixture: state });
    class LatLng { constructor(private lat: number, private lng: number) {} getLat() { return this.lat; } getLng() { return this.lng; } }
    class Overlay {
      constructor(public options: Record<string, unknown> = {}) {
        // 실제 SDK 처럼 CustomOverlay 의 content 요소를 지도 컨테이너에 넣는다.
        // 그래야 마커가 진짜 <button> 으로 키보드 초점을 받는지 확인할 수 있다.
        const content = options.content as HTMLElement | undefined;
        const map = options.map as { container?: HTMLElement; overlayCount?: number } | undefined;
        const container = map?.container;
        if (content instanceof HTMLElement && container && map) {
          // 실제 SDK 는 오버레이를 좌표 위에 절대배치한다. 스텁에도 같은 배치를
          // 흉내내야 마커가 다른 화면 요소에 가리지 않고 눌린다.
          const index = map.overlayCount = (map.overlayCount || 0) + 1;
          content.style.cssText = `position:absolute;z-index:400;left:${12 + ((index - 1) % 6) * 50}px;top:${96 + Math.floor((index - 1) / 6) * 50}px;`;
          container.appendChild(content);
        }
      }
      setMap(map: unknown) {
        this.options.map = map;
        const content = this.options.content as HTMLElement | undefined;
        if (!map && content instanceof HTMLElement) content.remove();
      }
    }
    const maps = {
      load: (callback: () => void) => callback(), LatLng, LatLngBounds: class { extend = noop; },
      Map: class {
        container: HTMLElement;
        constructor(container: HTMLElement) { this.container = container; }
        setBounds = noop; setCenter = noop; panTo = noop; setLevel = noop; relayout = noop; setMaxLevel = noop;
        setMapTypeId = noop; addOverlayMapTypeId = noop; removeOverlayMapTypeId = noop;
        getLevel() { return 9; }
        getBounds() { return { getSouthWest: () => new LatLng(35.1, 128.5), getNorthEast: () => new LatLng(35.4, 128.9) }; }
        getCenter() { return new LatLng(35.23, 128.68); }
      },
      Marker: class extends Overlay {}, CustomOverlay: class extends Overlay {},
      Polyline: class extends Overlay {}, Circle: class extends Overlay {},
      Roadview: class { setPanoId = noop; relayout = noop; },
      RoadviewClient: class { getNearestPanoId(_p: unknown, _r: number, callback: (id: number | null) => void) { callback(null); } },
      MapTypeId: { ROADMAP: 1, SKYVIEW: 2, HYBRID: 3, TRAFFIC: 4, TERRAIN: 5, BICYCLE: 6, BICYCLE_HYBRID: 7, USE_DISTRICT: 8 },
      event: { addListener: noop },
      services: {
        Places: class {
          categorySearch(code: string, callback: (places: unknown, status: string) => void) { state.requests.push({ code, callback }); }
          keywordSearch(code: string, callback: (places: unknown, status: string) => void) { this.categorySearch(code, callback); }
        },
        Status: { OK: "OK", ZERO_RESULT: "ZERO_RESULT", ERROR: "ERROR" },
        SortBy: { DISTANCE: "DISTANCE" },
      },
    };
    Object.defineProperty(window, "kakao", { value: { maps }, writable: true });
  });
  await page.route("**/api/map-config", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ provider: "kakao", javascriptKey: "e2e-stub-key" }) }));
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await openItinerary(page, { start: "2026-10-08" });
  await ensureMapView(page);
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
  await page.getByRole("button", { name: english ? "Map options" : "지도 도구", exact: true }).click();
  await page.locator('.map-command-bar button[aria-controls="map-panel-facility"]').click();
  const panel = page.locator("#map-panel-facility");
  await expect(panel).toBeVisible();
  expect(await facilityRequests(page)).toEqual([]);
  return panel;
}
