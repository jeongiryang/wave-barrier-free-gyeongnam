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

  const markerState = await markers.evaluateAll((nodes) => nodes.map((node) => {
    const element = node as HTMLElement;
    const rect = element.getBoundingClientRect();
    return {
      name: element.dataset.regionMarker || "지역",
      width: rect.width,
      height: rect.height,
    };
  }));

  for (const marker of markerState) {
    expect(marker.width, `${marker.name} 표식 너비`).toBeGreaterThanOrEqual(44);
    expect(marker.height, `${marker.name} 표식 높이`).toBeGreaterThanOrEqual(44);
  }

  // 이전 표식을 선택하면 React가 지도 표식 트리를 다시 만들 수 있다. 각 반복에서
  // 현재 DOM의 표식을 이름으로 다시 찾고 DOM click 이벤트를 보내 18개 선택 계약을
  // 검증한다. Playwright의 actionability 대기 중 노드 교체가 일어나는 CI flake와 분리한다.
  for (const { name } of markerState) {
    const marker = page.locator(`[data-region-marker="${name}"]`);
    await marker.evaluate((node) => (node as HTMLElement).click());
    await expect(page.locator(`[data-region-marker="${name}"]`), `${name} 표식이 선택되어야 한다`).toHaveClass(/active/);
  }

  // 포인터 hit-testing 자체도 대표 표식에서 실제 Playwright click으로 확인한다.
  const representative = page.locator(`[data-region-marker="${markerState[0].name}"]`);
  await representative.scrollIntoViewIfNeeded();
  await representative.click();
  await expect(page.locator(`[data-region-marker="${markerState[0].name}"]`)).toHaveClass(/active/);
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
