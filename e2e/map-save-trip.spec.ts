import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

/**
 * 지도 도구의 "저장"은 예전에 아무도 읽지 않는 저장소 키에 써 놓고
 * "저장했습니다"라고만 알렸다. 이제는 새로고침을 견디는 이 기기 일정에 추가한다.
 *
 * 이 패널은 Kakao 지도가 연결된 상태에서만 열리므로, 실제 SDK 대신 최소 스텁을
 * 넣어 그 상태를 만든다. loadKakaoSdk는 `window.kakao.maps.services`가 이미 있으면
 * 네트워크를 타지 않고 바로 통과한다.
 */
async function withKakaoStub(page: Page) {
  await page.addInitScript(() => {
    const noop = () => undefined;
    // `new K.Marker(...)`처럼 생성자로 불리므로 화살표 함수를 쓰면 안 된다.
    class Overlay { setMap = noop; }
    const maps = {
      load: (callback: () => void) => callback(),
      LatLng: class {
        constructor(private lat: number, private lng: number) {}
        getLat() { return this.lat; }
        getLng() { return this.lng; }
      },
      LatLngBounds: class { extend() { return undefined; } },
      Map: class {
        setBounds = noop; setCenter = noop; panTo = noop; setLevel = noop;
        setMapTypeId = noop; addOverlayMapTypeId = noop; removeOverlayMapTypeId = noop;
        relayout = noop;
        getCenter() { return { getLat: () => 35.23, getLng: () => 128.68 }; }
      },
      Marker: Overlay,
      CustomOverlay: Overlay,
      Polyline: Overlay,
      Circle: Overlay,
      Roadview: class { setPanoId = noop; relayout = noop; },
      RoadviewClient: class { getNearestPanoId(_p: unknown, _r: number, cb: (id: number | null) => void) { cb(null); } },
      MapTypeId: { ROADMAP: 1, SKYVIEW: 2, HYBRID: 3, TRAFFIC: 4, TERRAIN: 5, BICYCLE: 6, BICYCLE_HYBRID: 7, USE_DISTRICT: 8 },
      event: { addListener: noop },
      services: {
        Places: class { categorySearch = noop; keywordSearch = noop; },
        Status: { OK: "OK" },
        SortBy: { DISTANCE: "DISTANCE" },
      },
    };
    Object.defineProperty(window, "kakao", { value: { maps }, writable: true });
  });
  await page.route("**/api/map-config", (requestRoute) => requestRoute.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ provider: "kakao", javascriptKey: "e2e-stub-key" }),
  }));
}

async function savedCount(page: Page) {
  const label = await page.locator(".header-action").first().textContent();
  return Number((label || "").replace(/[^0-9]/g, "") || "0");
}

test("지도에서 저장하면 이 기기 일정에 추가되고 새로고침 뒤에도 남는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);

  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
  await page.locator("nav.map-command-bar").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "레이어·측정" })).toBeEnabled();
  expect(await savedCount(page)).toBe(0);

  await page.getByRole("button", { name: "레이어·측정" }).click();
  const layerPanel = page.getByRole("region", { name: "지도 레이어와 측정 도구" });
  const saveButton = layerPanel.getByRole("button", { name: "이 기기 일정에 추가", exact: true });
  await saveButton.focus();
  await saveButton.press("Enter");

  // 담은 개수가 화면에 바로 보인다.
  await expect.poll(() => savedCount(page)).toBeGreaterThan(0);
  const afterSave = await savedCount(page);

  const stored = await page.evaluate(() => ({
    places: window.localStorage.getItem("wave-saved-places"),
    deadKey: window.localStorage.getItem("wave-saved-map"),
  }));
  expect(stored.deadKey, "아무도 읽지 않는 키에 다시 쓰면 안 된다").toBeNull();
  expect(JSON.parse(stored.places || "[]").length).toBe(afterSave);

  await page.reload();
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
  await expect.poll(() => savedCount(page)).toBe(afterSave);
});

test("이미 담긴 여행지를 다시 저장해도 중복으로 쌓이지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);

  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
  await page.locator("nav.map-command-bar").scrollIntoViewIfNeeded();
  const layerTrigger = page.getByRole("button", { name: "레이어·측정" });
  await expect(layerTrigger).toBeEnabled();
  await layerTrigger.click();
  const layerPanel = page.getByRole("region", { name: "지도 레이어와 측정 도구" });

  const saveButton = layerPanel.getByRole("button", { name: "이 기기 일정에 추가", exact: true });
  await saveButton.focus();
  await saveButton.press("Enter");
  await expect.poll(() => savedCount(page)).toBeGreaterThan(0);
  const first = await savedCount(page);

  // 안내 문구는 지도가 다시 그려질 때 덮이므로(별도 작업 단위), 남는 결과로 확인한다.
  await saveButton.focus();
  await saveButton.press("Enter");
  await page.waitForTimeout(800);
  expect(await savedCount(page)).toBe(first);
  const ids = await page.evaluate(() => JSON.parse(window.localStorage.getItem("wave-saved-places") || "[]"));
  expect(ids.length).toBe(first);
  expect(new Set(ids).size).toBe(ids.length);
});
