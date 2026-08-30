import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

/**
 * 지도 도구는 8개라 가로 한 줄에 다 들어가지 않는다. 예전에는 데스크톱에서
 * 스크롤바까지 숨겨 두어 "⇩ 이미지"와 "↗ 공유"가 아무 표시 없이 사라졌다.
 * 더 있다는 사실이 보여야 하고, 실제로 닿을 수 있어야 한다.
 */
async function withKakaoStub(page: Page) {
  await page.addInitScript(() => {
    const noop = () => undefined;
    class Overlay { setMap = noop; }
    const maps = {
      load: (callback: () => void) => callback(),
      LatLng: class { constructor(private lat: number, private lng: number) {} getLat() { return this.lat; } getLng() { return this.lng; } },
      LatLngBounds: class { extend() { return undefined; } },
      Map: class {
        setBounds = noop; setCenter = noop; panTo = noop; setLevel = noop;
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

const WIDTHS = [1440, 1024, 900, 768, 620, 390];

test("가려진 지도 도구가 있으면 스크롤 손잡이를 보여 준다", async ({ page }) => {
  test.slow();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/planner", { waitUntil: "domcontentloaded" });
    await page.locator("nav.map-command-bar").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1_500);

    const state = await page.evaluate(() => {
      const scroll = document.querySelector(".map-command-scroll") as HTMLElement | null;
      if (!scroll) return null;
      const style = getComputedStyle(scroll);
      return {
        overflowing: scroll.scrollWidth > Math.round(scroll.getBoundingClientRect().width) + 1,
        scrollbar: style.scrollbarWidth,
      };
    });
    expect(state, `${width}px에서 지도 도구 줄을 찾지 못했다`).not.toBeNull();
    if (!state?.overflowing) continue;
    expect(state.scrollbar, `${width}px에서 가려진 도구가 있는데 스크롤 손잡이가 없다`).not.toBe("none");
  }
});

test("가려진 지도 도구도 끝까지 끌면 모두 드러난다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/planner", { waitUntil: "domcontentloaded" });
  await page.locator("nav.map-command-bar").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_500);

  const hidden = await page.evaluate(() => {
    const scroll = document.querySelector(".map-command-scroll") as HTMLElement;
    scroll.scrollLeft = scroll.scrollWidth;
    const box = scroll.getBoundingClientRect();
    return [...scroll.children]
      .map((node) => {
        const item = node.getBoundingClientRect();
        return { label: (node.textContent || "").replace(/\s+/g, " ").trim(), visible: item.right <= box.right + 1 && item.left >= box.left - 1 };
      })
      .filter((item) => !item.visible)
      .map((item) => item.label);
  });
  // 끝까지 끌었을 때 마지막 도구들이 보여야 한다. 시작 쪽이 밀려나는 것은 정상이다.
  const lastTools = await page.evaluate(() => {
    const scroll = document.querySelector(".map-command-scroll") as HTMLElement;
    const box = scroll.getBoundingClientRect();
    const items = [...scroll.children];
    const last = items[items.length - 1].getBoundingClientRect();
    const secondLast = items[items.length - 2].getBoundingClientRect();
    return {
      last: last.right <= box.right + 1,
      secondLast: secondLast.right <= box.right + 1,
      labels: items.slice(-2).map((node) => (node.textContent || "").replace(/\s+/g, " ").trim()),
    };
  });
  expect(lastTools.last, `끝까지 끌어도 "${lastTools.labels[1]}"가 보이지 않는다`).toBe(true);
  expect(lastTools.secondLast, `끝까지 끌어도 "${lastTools.labels[0]}"가 보이지 않는다`).toBe(true);
  expect(hidden.length, "가려진 도구가 남았다").toBeLessThan(4);
});

test("키보드로 넘기면 가려진 지도 도구가 화면 안으로 들어온다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await withKakaoStub(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/planner", { waitUntil: "domcontentloaded" });
  await page.locator("nav.map-command-bar").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_500);

  // 이름 부분 일치라 지도 밖 버튼("항공·선박·공유 이동", "공유 링크 만들기")까지 걸린다.
  const share = page.locator(".map-command-scroll").getByRole("button", { name: "공유" }).first();
  await share.focus();
  await page.waitForTimeout(400);
  const inView = await share.evaluate((node) => {
    const scroll = node.closest(".map-command-scroll") as HTMLElement;
    const box = scroll.getBoundingClientRect();
    const item = node.getBoundingClientRect();
    return item.left >= box.left - 1 && item.right <= box.right + 1;
  });
  expect(inView, "초점을 옮겨도 공유 버튼이 화면 밖에 남는다").toBe(true);
});
