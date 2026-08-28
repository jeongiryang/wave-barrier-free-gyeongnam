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
  await markers.first().scrollIntoViewIfNeeded();

  for (let index = 0; index < 18; index += 1) {
    const marker = markers.nth(index);
    const name = await marker.getAttribute("data-region-marker");
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
    left: node.scrollLeft,
    width: node.clientWidth,
    scrollWidth: node.scrollWidth,
    scrollbarWidth: getComputedStyle(node).scrollbarWidth,
  }));
  expect(before.scrollWidth).toBeGreaterThan(before.width);
  expect(before.scrollbarWidth).not.toBe("none");

  await scroll.evaluate((node) => node.scrollTo({ left: node.scrollWidth, behavior: "instant" }));
  await expect.poll(() => scroll.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: /공유/ })).toBeVisible();
});
