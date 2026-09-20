import { openSupportMenu } from "./support-menu";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions, openFirstPlaceMap, showItineraryMap } from "./fixtures";

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

// 도구 개수를 고정하면 도구를 하나 더하거나 문구를 바꿀 때마다 깨지므로, 개수 대신 실제로 존재하는 도구 버튼 전부를 질의해 검사한다.
const advancedTools = (nav: Locator) => nav.locator(".map-advanced-controls");

/** 접힌 상태: 추가 도구는 감춰지고, 그 외 기본 제어는 하나도 빠짐없이 접근 가능한 이름으로 남는다. */
async function expectToolsCollapsed(nav: Locator) {
  await expect(advancedTools(nav)).toBeHidden();
  const advanced = await advancedTools(nav).locator("button").count();
  const rendered = await nav.locator("button").count();
  expect(advanced).toBeGreaterThan(0);
  await expect(nav.getByRole("button")).toHaveCount(rendered - advanced);
}

/** 펼친 상태: DOM에 있는 모든 도구 버튼이 빠짐없이 접근성 트리에 노출된다. */
async function expectToolsExpanded(nav: Locator) {
  await expect(advancedTools(nav)).toBeVisible();
  const rendered = await nav.locator("button").count();
  expect(await advancedTools(nav).locator("button").count()).toBeGreaterThan(0);
  await expect(nav.getByRole("button")).toHaveCount(rendered);
}

for (const locale of ["ko", "en"]) {
  test(`connected map label leaves usable tool space without overlap ${locale}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPlannerApi(page);
    await withKakaoStub(page);
    await page.goto("/planner");
    await chooseTripConditions(page); await openFirstPlaceMap(page);
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
    await expectToolsCollapsed(nav);
    await nav.getByRole("button", { name: locale === "en" ? "Map options" : "지도 도구", exact: true }).click();
    await expectToolsExpanded(nav);
    for (const width of [1440, 1024, 900, 768, 320]) {
      await page.setViewportSize({ width, height: 960 });
      const view = page.getByRole('group', { name: '일정 보기 방식', exact: true });
      // The first desktop-to-mobile resize must render its controls before
      // the helper decides whether to select the previously hidden map.
      if (width < 1024) {
        await expect(view).toBeVisible();
        await showItineraryMap(page);
        await expect(view.getByRole('button', { name: '지도', exact: true })).toHaveAttribute('aria-pressed', 'true');
      } else await expect(view).toHaveCount(0);
      await expect(page.locator('.route-map-shell')).toBeVisible();
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
    await showItineraryMap(page);
    await page.goto("/planner");
    await chooseTripConditions(page); await openFirstPlaceMap(page);
    const nav = page.locator("nav.map-command-bar");
    await nav.scrollIntoViewIfNeeded();
    await expectToolsCollapsed(nav);
    const more = nav.getByRole("button", { name: "지도 도구", exact: true });
    await expect(more).toHaveAttribute("aria-expanded", "false");
    if ([1440, 960, 390].includes(width)) await page.locator(".route-map-shell").screenshot({ path: test.info().outputPath(`map-${width}-collapsed.png`) });
    await more.click();
    await expectToolsExpanded(nav);
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
  await chooseTripConditions(page); await openFirstPlaceMap(page);
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
  const nav = page.locator("nav.map-command-bar");
  const options = nav.getByRole("group", { name: "추가 지도 도구", exact: true });
  await expect(options).toBeHidden();
  await nav.getByRole("button", { name: "지도 도구", exact: true }).click();
  await expect(options).toBeVisible();
  // 이 검사의 뜻은 아래 도구가 모두 남아 있는지이므로, 완전 일치 대신 포함으로 확인해 도구가 늘어도 계약이 유지되게 한다.
  const toolLabels = await options.getByRole("button").allTextContents();
  for (const label of ["지도", "스카이뷰", "⌖ 주변", "▱ 지도 표시", "◉ 로드뷰", "⇩ 이미지", "↗ 페이지 링크"]) {
    expect(toolLabels).toContain(label);
  }
  for (const button of await options.getByRole("button").all()) {
    // Touch browsers do not consistently scroll a programmatically focused
    // control into view. Exercise the same scroll a pointer user can perform.
    await button.scrollIntoViewIfNeeded();
    await button.focus();
    await expect(button).toBeFocused();
    await expect.poll(() => button.evaluate(node => {
      const box = node.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return node.contains(hit) ? "reachable" : `${node.textContent}: ${hit?.tagName}.${(hit as HTMLElement | null)?.className}`;
    }), { message: "Every map tool must be reachable after scrolling into view" }).toBe("reachable");
  }
});

test("키보드로 추가 도구를 열고 닫으면 초점이 지도 도구 버튼으로 돌아온다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);
  await page.goto("/planner");
  await chooseTripConditions(page); await openFirstPlaceMap(page);
  await expect(page.locator(".map-provider-badge.kakao")).toBeVisible();
  const nav = page.locator("nav.map-command-bar");
  const more = nav.getByRole("button", { name: "지도 도구", exact: true });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(more).toHaveAttribute("aria-expanded", "true");
  const controls = nav.getByRole("button");
  // 도구 개수를 고정하지 않고 실제 렌더링된 버튼 수만큼 순회한다.
  const toolCount = await nav.locator("button").count();
  for (let index = 3; index < toolCount; index++) {
    await page.keyboard.press("Tab");
    await expect(controls.nth(index)).toBeFocused();
  }
  await page.keyboard.press("Escape");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(more).toBeFocused();
  await expectToolsCollapsed(nav);
});

test("확대 지도에서 Escape는 안쪽 도구부터 닫고 숨겨진 제어로 초점을 보내지 않는다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);
  await page.addInitScript(() => { HTMLElement.prototype.requestFullscreen = async () => { throw new DOMException("Controlled unsupported fullscreen", "NotSupportedError"); }; });
  await page.goto("/planner");
  await chooseTripConditions(page); await openFirstPlaceMap(page);
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
