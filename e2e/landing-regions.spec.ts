import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

const LAYOUT_TOLERANCE = 1.5;

test("경남 18개 지역 표식이 지도와 같은 좌표계 안에 유지된다", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/");
  await page.evaluate(async () => { await document.fonts.ready; });

  const map = page.locator("[data-region-map-canvas]");
  await expect(map).toBeVisible();
  const canvas = await map.evaluate((element) => ({
    width: (element as HTMLElement).clientWidth,
    height: (element as HTMLElement).clientHeight,
  }));
  expect(canvas.width).toBeGreaterThan(0);
  expect(canvas.height).toBeGreaterThan(0);
  expect(canvas.width / canvas.height).toBeCloseTo(600 / 433, 2);

  const markers = page.locator("[data-region-marker]");
  await expect(markers).toHaveCount(18);

  const positions: Record<string, { x: number; y: number }> = {};
  for (let index = 0; index < 18; index += 1) {
    const marker = markers.nth(index);
    const layout = await marker.evaluate((element) => {
      const item = element as HTMLElement;
      const parent = item.offsetParent as HTMLElement | null;
      return {
        name: item.dataset.regionMarker || "",
        x: Number(item.dataset.regionX),
        y: Number(item.dataset.regionY),
        left: item.offsetLeft,
        top: item.offsetTop,
        parentWidth: parent?.clientWidth ?? 0,
        parentHeight: parent?.clientHeight ?? 0,
      };
    });

    expect(layout.parentWidth).toBe(canvas.width);
    expect(layout.parentHeight).toBe(canvas.height);
    const expectedLeft = layout.parentWidth * (layout.x / 100);
    const expectedTop = layout.parentHeight * (layout.y / 100);
    expect(Math.abs(layout.left - expectedLeft)).toBeLessThan(LAYOUT_TOLERANCE);
    expect(Math.abs(layout.top - expectedTop)).toBeLessThan(LAYOUT_TOLERANCE);
    expect(layout.left).toBeGreaterThan(0);
    expect(layout.left).toBeLessThan(layout.parentWidth);
    expect(layout.top).toBeGreaterThan(0);
    expect(layout.top).toBeLessThan(layout.parentHeight);
    positions[layout.name] = { x: layout.left, y: layout.top };
  }

  expect(positions["거창"].x).toBeLessThan(positions["합천"].x);
  expect(positions["합천"].x).toBeLessThan(positions["창녕"].x);
  expect(positions["창녕"].x).toBeLessThan(positions["양산"].x);
  expect(positions["거창"].y).toBeLessThan(positions["남해"].y);
});
