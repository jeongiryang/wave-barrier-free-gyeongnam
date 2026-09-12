import { openSupportMenu } from "./support-menu";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

/**
 * 기본 이동 제어와 추가 지도 도구를 분리해도 원래 모든 동작에 닿아야 한다.
 * 접힘 상태, 전체 도구의 위치·44px·초점과 중첩 Escape를 검증한다.
 */
async function withKakaoStub(page: Page) {
  await page.addInitScript(() => {
    const noop = () => undefined;
    const metrics = { maps: 0 };
    Object.assign(window, { mapToolbarFixture: metrics });
    class Overlay { setMap = noop; }
    const maps = {
      load: (callback: () => void) => callback(),
      LatLng: class { constructor(private lat: number, private lng: number) {} getLat() { return this.lat; } getLng() { return this.lng; } },
      LatLngBounds: class { extend() { return undefined; } },
      Map: class {
        constructor() { metrics.maps++; }
        setBounds = noop; setCenter = noop; panTo = noop; setLevel = noop; setMaxLevel = noop;
        getLevel() { return 9; }
        getBounds() { return { getSouthWest: () => ({ getLat: () => 35.1, getLng: () => 128.5 }), getNorthEast: () => ({ getLat: () => 35.4, getLng: () => 128.9 }) }; }
        setMapTypeId = noop; addOverlayMapTypeId = noop; removeOverlayMapTypeId = noop; relayout = noop;
        getCenter() { return { getLat: () => 35.23, getLng: () => 128.68 }; }
      },
      Marker: Overlay, CustomOverlay: Overlay, Polyline: Overlay, Circle: Overlay,
      Roadview: class { setPanoId = noop; relayout = noop; },
      RoadviewClient: class { getNearestPanoId(_point: unknown, _radius: number, done: (id: number | null) => void) { done(null); } },
      MapTypeId: { ROADMAP: 1, SKYVIEW: 2, HYBRID: 3, TRAFFIC: 4, TERRAIN: 5, BICYCLE: 6, BICYCLE_HYBRID: 7, USE_DISTRICT: 8 },
      event: { addListener: noop },
      services: { Places: class { categorySearch = noop; keywordSearch = noop; }, Status: { OK: "OK" }, SortBy: { DISTANCE: "DISTANCE" } },
    };
    Object.defineProperty(window, "kakao", { value: { maps }, writable: true });
  });
  await page.route("**/api/map-config", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ provider: "kakao", javascriptKey: "e2e-stub-key" }),
  }));
}

const WIDTHS = [1440, 1024, 960, 900, 768, 620, 390];

for (const locale of ["ko", "en"]) {
  test(`connected map label leaves usable tool space without overlap ${locale}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPlannerApi(page);
    await withKakaoStub(page);
    await page.goto("/planner");
    await chooseTripConditions(page);
    await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
    if (locale === "en") {
      await openSupportMenu(page);
      const preferences = page.locator(".preference-controls:visible");
      const trigger = preferences.getByLabel("환경설정 열기", { exact: true });
      await trigger.focus();
      await expect(trigger).toBeInViewport();
      await page.keyboard.press("Enter");
      await preferences.getByLabel("언어", { exact: true }).selectOption("en");
      await openSupportMenu(page);
      await preferences.getByLabel("Open preferences", { exact: true }).click();
    }
    const nav = page.locator("nav.map-command-bar");
    await expect(nav.getByRole("button")).toHaveCount(4);
    await nav.getByRole("button", { name: locale === "en" ? "Map options" : "지도 도구", exact: true }).click();
    await expect(nav.getByRole("button")).toHaveCount(11);
    for (const width of [1440, 1024, 900, 768, 320]) {
      await page.setViewportSize({ width, height: 960 });
      await nav.scrollIntoViewIfNeeded();
      await expect.poll(() => page.evaluate(() => {
        const badge = document.querySelector(".map-provider-badge")!.getBoundingClientRect();
        const tools = document.querySelector("nav.map-command-bar")!.getBoundingClientRect();
        return Math.max(0, Math.min(badge.right, tools.right) - Math.max(badge.left, tools.left)) *
          Math.max(0, Math.min(badge.bottom, tools.bottom) - Math.max(badge.top, tools.top));
      }), { message: `${locale} ${width}px map status must not cover tools` }).toBe(0);
      const share = nav.getByRole("button", { name: locale === "en" ? "↗ Page link" : "↗ 페이지 링크", exact: true });
      await share.focus();
      await expect(share).toBeFocused();
      await expect.poll(() => share.evaluate((node) => {
        const box = node.closest(".map-command-scroll")!.getBoundingClientRect();
        const item = node.getBoundingClientRect();
        return item.left >= box.left - 1 && item.right <= box.right + 1 && item.height >= 44;
      }), { message: `${locale} ${width}px page-link control must be reachable and at least 44px tall` }).toBe(true);
      const route = nav.getByRole("button", { name: locale === "en" ? "⇄ Route points" : "⇄ 출발·도착", exact: true });
      await route.focus();
      await expect(route).toBeFocused();
      await expect.poll(() => route.evaluate((node) => {
        const box = node.closest(".map-command-scroll")!.getBoundingClientRect();
        const item = node.getBoundingClientRect();
        return item.left >= box.left - 1 && item.right <= box.right + 1 && item.height >= 44;
      }), { message: `${locale} ${width}px route control must be fully reachable` }).toBe(true);
    }
  });
}

test("기본 지도 제어와 펼친 추가 도구가 모든 폭에서 잘리지 않는다", async ({ page }) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);
  for (const width of [...WIDTHS, 280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/planner");
    await chooseTripConditions(page);
    const nav = page.locator("nav.map-command-bar");
    await nav.scrollIntoViewIfNeeded();
    await expect(nav.getByRole("button")).toHaveCount(4);
    const more = nav.getByRole("button", { name: "지도 도구", exact: true });
    await expect(more).toHaveAttribute("aria-expanded", "false");
    if ([1440, 960, 390].includes(width)) await page.locator(".route-map-shell").screenshot({ path: test.info().outputPath(`map-${width}-collapsed.png`) });
    await more.click();
    await expect(nav.getByRole("button")).toHaveCount(11);
    await expect.poll(() => nav.evaluate(node => {
      const box = node.getBoundingClientRect();
      return [...node.querySelectorAll("button")].filter(button => {
        const rect = button.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44 || rect.left < box.left - 1 || rect.right > box.right + 1 || button.scrollWidth > button.clientWidth + 1;
      }).map(button => button.textContent);
    }), { message: `${width}px every map action must fit and remain at least44px` }).toEqual([]);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), { message: `${width}px content must remain inside the viewport` }).toBeLessThanOrEqual(1);
    if ([1440, 960, 390].includes(width)) await page.locator(".route-map-shell").screenshot({ path: test.info().outputPath(`map-${width}-options.png`) });
  }
});

test("추가 도구에는 지도 유형·주변·표시·로드뷰·이미지·페이지 링크가 모두 남는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
  const nav = page.locator("nav.map-command-bar");
  const options = nav.getByRole("group", { name: "추가 지도 도구", exact: true });
  await expect(options).toBeHidden();
  await nav.getByRole("button", { name: "지도 도구", exact: true }).click();
  await expect(options).toBeVisible();
  await expect(options.getByRole("button")).toHaveText(["지도", "스카이뷰", "⌖ 주변", "▱ 지도 표시", "◉ 로드뷰", "⇩ 이미지", "↗ 페이지 링크"]);
  for (const button of await options.getByRole("button").all()) {
    await button.focus();
    await expect(button).toBeFocused();
    expect(await button.evaluate(node => {
      const box = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
  }
});

test("키보드로 추가 도구를 열고 닫으면 초점이 지도 도구 버튼으로 돌아온다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
  const nav = page.locator("nav.map-command-bar");
  const more = nav.getByRole("button", { name: "지도 도구", exact: true });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(more).toHaveAttribute("aria-expanded", "true");
  const controls = nav.getByRole("button");
  // After the master button: expand, then each of the seven advanced actions.
  for (let index = 3; index < 11; index++) {
    await page.keyboard.press("Tab");
    await expect(controls.nth(index)).toBeFocused();
  }
  await page.keyboard.press("Escape");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();
  await expect(nav.getByRole("button")).toHaveCount(4);
});

test("확대 지도에서 Escape는 안쪽 도구부터 닫고 숨겨진 제어로 초점을 보내지 않는다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);
  await page.addInitScript(() => { HTMLElement.prototype.requestFullscreen = async () => { throw new DOMException("Controlled unsupported fullscreen", "NotSupportedError"); }; });
  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
  const count = () => page.evaluate(() => (window as unknown as { mapToolbarFixture: { maps: number } }).mapToolbarFixture.maps);
  const initial = await count();
  const shell = page.locator(".route-map-shell");
  const nav = shell.locator("nav.map-command-bar");
  await nav.getByRole("button", { name: "⛶ 전체보기", exact: true }).click();
  await expect(shell).toHaveClass(/expanded/);
  const more = nav.getByRole("button", { name: "지도 도구", exact: true });
  await more.click();
  const exportButton = nav.getByRole("button", { name: "⇩ 이미지", exact: true });
  await exportButton.click();
  const panel = page.locator("#map-panel-export");
  await expect(panel.locator("header > button")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(shell).toHaveClass(/expanded/);
  await expect(exportButton).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();
  await expect(shell).toHaveClass(/expanded/);
  await more.click();
  await exportButton.click();
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await panel.locator("header > button").focus();
  await page.keyboard.press("Escape");
  await expect(more).toBeFocused();
  await expect(shell).toHaveClass(/expanded/);
  await page.keyboard.press("Escape");
  await expect(shell).not.toHaveClass(/expanded/);
  expect(await count()).toBe(initial);
  expect(errors).toEqual([]);
});
