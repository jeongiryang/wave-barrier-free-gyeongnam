import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

const MOBILE = { width: 390, height: 844 };

test("모바일 경남 18개 지역 표식은 44px 조작 영역과 선택 가능한 버튼 계약을 유지한다", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/");
  await expect(page.locator(".region-story-copy")).toHaveClass(/is-visible/);

  const markers = page.locator("[data-region-marker]");
  await expect(markers).toHaveCount(18);

  // 18개 전체의 크기·버튼 계약은 상호작용 전에 한 번에 읽는다. 지역 선택은 상세
  // 영역 이동과 React 재렌더를 동반하므로 한 페이지에서 18번 연속 actionability를
  // 검사하면 제품 크기와 무관한 DOM 교체 경쟁 조건이 생긴다.
  const markerState = await markers.evaluateAll((nodes) => nodes.map((node) => {
    const element = node as HTMLButtonElement;
    const rect = element.getBoundingClientRect();
    return {
      name: element.dataset.regionMarker || "지역",
      width: rect.width,
      height: rect.height,
      tagName: element.tagName,
      type: element.type,
      disabled: element.disabled,
      label: element.getAttribute("aria-label") || "",
    };
  }));

  expect(new Set(markerState.map((marker) => marker.name)).size).toBe(18);
  for (const marker of markerState) {
    expect(marker.width, `${marker.name} 표식 너비`).toBeGreaterThanOrEqual(44);
    expect(marker.height, `${marker.name} 표식 높이`).toBeGreaterThanOrEqual(44);
    expect(marker.tagName, `${marker.name} 표식 요소`).toBe("BUTTON");
    expect(marker.type, `${marker.name} 버튼 type`).toBe("button");
    expect(marker.disabled, `${marker.name} 표식 활성 상태`).toBe(false);
    expect(marker.label, `${marker.name} 접근 가능한 이름`).toContain(marker.name);
  }

  // 실제 포인터 hit-testing과 상태 변경은 대표 표식에서 검증한다. 모든 표식은 같은
  // map 렌더 루프와 동일 onClick 계약을 사용하며, 이름/좌표의 고유성은 위와 기존
  // landing-regions 회귀가 18개 모두 검증한다.
  const representativeName = markerState[0].name;
  await page.locator(`[data-region-marker="${representativeName}"]`).click();
  await expect(page.locator(`[data-region-marker="${representativeName}"]`)).toHaveClass(/active/);
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

  const readinessActions = page.locator(".readiness-actions button");
  await expect(readinessActions).toHaveCount(2);
  const readinessSizes = await readinessActions.evaluateAll((nodes) => nodes.map((node) => {
    const rect = (node as HTMLElement).getBoundingClientRect();
    return { text: node.textContent?.trim() || "button", width: rect.width, height: rect.height };
  }));
  for (const size of readinessSizes) {
    expect(size.height, `${size.text} 높이`).toBeGreaterThanOrEqual(44);
    expect(size.width, `${size.text} 너비`).toBeGreaterThanOrEqual(44);
  }
});
