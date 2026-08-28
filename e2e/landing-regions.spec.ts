import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test("경남 18개 지역 표식이 지도와 같은 좌표계 안에 유지된다", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/");

  const map = page.locator("[data-region-map-canvas]");
  await map.scrollIntoViewIfNeeded();
  await expect(map).toBeVisible();
  await page.waitForTimeout(850);

  const mapBox = await map.boundingBox();
  expect(mapBox).not.toBeNull();
  if (!mapBox) return;
  expect(mapBox.width / mapBox.height).toBeCloseTo(600 / 433, 2);

  const markers = page.locator("[data-region-marker]");
  await expect(markers).toHaveCount(18);

  for (let index = 0; index < 18; index += 1) {
    const marker = markers.nth(index);
    const markerBox = await marker.boundingBox();
    const x = Number(await marker.getAttribute("data-region-x"));
    const y = Number(await marker.getAttribute("data-region-y"));
    expect(markerBox).not.toBeNull();
    if (!markerBox) continue;

    const centerX = markerBox.x + markerBox.width / 2;
    const centerY = markerBox.y + markerBox.height / 2;
    const expectedX = mapBox.x + mapBox.width * (x / 100);
    const expectedY = mapBox.y + mapBox.height * (y / 100);

    expect(Math.abs(centerX - expectedX)).toBeLessThan(4);
    expect(Math.abs(centerY - expectedY)).toBeLessThan(4);
    expect(centerX).toBeGreaterThan(mapBox.x);
    expect(centerX).toBeLessThan(mapBox.x + mapBox.width);
    expect(centerY).toBeGreaterThan(mapBox.y);
    expect(centerY).toBeLessThan(mapBox.y + mapBox.height);
  }

  const centers = async (name: string) => {
    const box = await page.locator(`[data-region-marker="${name}"]`).boundingBox();
    expect(box).not.toBeNull();
    return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
  };
  const geochang = await centers("거창");
  const hapcheon = await centers("합천");
  const changnyeong = await centers("창녕");
  const yangsan = await centers("양산");
  const namhae = await centers("남해");

  expect(geochang.x).toBeLessThan(hapcheon.x);
  expect(hapcheon.x).toBeLessThan(changnyeong.x);
  expect(changnyeong.x).toBeLessThan(yangsan.x);
  expect(geochang.y).toBeLessThan(namhae.y);
});
