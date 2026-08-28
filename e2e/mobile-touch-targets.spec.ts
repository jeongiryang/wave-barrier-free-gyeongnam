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

    // 지역 선택은 상세 영역으로 화면을 이동시킬 수 있다. 다음 표식을 측정하기 전에
    // 다시 지도 안으로 가져와 content-visibility 최적화에 의해 레이아웃 박스가
    // 비활성화된 상태를 제품 결함으로 오인하지 않도록 한다.
    await marker.scrollIntoViewIfNeeded();
    await expect(marker, `${name} 표식이 보여야 한다`).toBeVisible();

    const box = await marker.boundingBox();
    expect(box, `${name} 표식의 크기를 읽을 수 있어야 한다`).not.toBeNull();
    expect(box!.width, `${name} 표식 너비`).toBeGreaterThanOrEqual(44);
    expect(box!.height, `${name} 표식 높이`).toBeGreaterThanOrEqual(44);

    // 실제 중심점을 눌러도 이웃 표식이 가로채지 않아야 한다.
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
