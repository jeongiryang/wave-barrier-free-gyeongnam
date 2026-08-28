import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

const MOBILE = { width: 390, height: 844 };

test("모바일 경남 18개 지역 표식은 44px 조작 영역을 확보하고 각각 선택된다", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/");

  const markers = page.locator("[data-region-marker]");
  await expect(markers).toHaveCount(18);

  for (let index = 0; index < 18; index += 1) {
    const marker = markers.nth(index);
    const name = await marker.getAttribute("data-region-marker");

    // 지역 선택 뒤 화면이 상세 영역으로 이동해도 다음 표식의 실제 CSS 박스는 DOM에서
    // 직접 읽을 수 있다. Playwright boundingBox()는 offscreen/content-visibility 상태에서
    // null을 돌려 제품 크기와 무관한 flake를 만들 수 있으므로 사용하지 않는다.
    const size = await marker.evaluate((node) => {
      const rect = (node as HTMLElement).getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(size.width, `${name} 표식 너비`).toBeGreaterThanOrEqual(44);
    expect(size.height, `${name} 표식 높이`).toBeGreaterThanOrEqual(44);

    // 실제 클릭 가능성과 선택 결과는 별도로 검증한다.
    await marker.scrollIntoViewIfNeeded();
    await marker.click();
    await expect(marker, `${name} 표식이 직접 선택되어야 한다`).toHaveClass(/active/);
  }
});

test("모바일 지도 명령은 44px 조작 영역과 수평 탐색 경로를 유지한다", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner");

  const commandBar = page.locator("nav.map-command-bar");
  await commandBar.scrollIntoViewIfNeeded();
  await expect(commandBar).toBeVisible();

  const buttons = commandBar.locator("button");
  expect(await buttons.count()).toBeGreaterThan(5);
  const sizes = await buttons.evaluateAll((nodes) => nodes.map((node) => {
    const rect = (node as HTMLElement).getBoundingClientRect();
    return { text: node.textContent?.trim() || "button", width: rect.width, height: rect.height };
  }));
  for (const size of sizes) {
    expect(size.height, `${size.text} 높이`).toBeGreaterThanOrEqual(44);
    expect(size.width, `${size.text} 너비`).toBeGreaterThanOrEqual(44);
  }

  const scroll = commandBar.locator(".map-command-scroll");
  const before = await scroll.evaluate((node) => ({
    width: node.clientWidth,
    scrollWidth: node.scrollWidth,
    scrollbarWidth: getComputedStyle(node).scrollbarWidth,
  }));
  expect(before.scrollWidth).toBeGreaterThan(before.width);
  expect(before.scrollbarWidth).not.toBe("none");

  await scroll.evaluate((node) => { node.scrollLeft = node.scrollWidth; });
  await expect.poll(() => scroll.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await expect(commandBar.getByRole("button", { name: "↗ 공유", exact: true })).toBeVisible();
});
