import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

const SUBPIXEL_TOLERANCE = 5;

test("경남 18개 지역 표식이 지도와 같은 좌표계 안에 유지된다", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/");

  const map = page.locator("[data-region-map-canvas]");
  await map.scrollIntoViewIfNeeded();
  await expect(map).toBeVisible();

  // 등장 애니메이션이 도는 동안에도 표식은 자기 앵커 위에 있어야 한다. 확대를 개별
  // `scale` 속성으로 주면 중심을 맞추는 translate(-50%,-50%)까지 함께 줄어들어
  // 표식이 최대 20px 넘게 밀린 자리에서 제자리로 미끄러져 들어온다. 애니메이션을
  // 초반 구간에 세워 두고 재야 그 상태를 결정적으로 잡을 수 있다.
  const driftDuringArrival = await page.evaluate(() => {
    const canvas = document.querySelector("[data-region-map-canvas]")!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>("[data-region-marker]")].map((node) => {
      node.getAnimations().forEach((animation) => {
        animation.pause();
        animation.currentTime = 100;
      });
      const box = node.getBoundingClientRect();
      return Math.max(
        Math.abs(box.x + box.width / 2 - (canvas.x + (canvas.width * Number(node.dataset.regionX)) / 100)),
        Math.abs(box.y + box.height / 2 - (canvas.y + (canvas.height * Number(node.dataset.regionY)) / 100)),
      );
    });
  });
  expect(Math.max(...driftDuringArrival)).toBeLessThan(1);
  await page.evaluate(() => {
    document.querySelectorAll("[data-region-marker]").forEach((node) => {
      node.getAnimations().forEach((animation) => animation.finish());
    });
  });
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

    // Chromium의 CSS 비율/글꼴 렌더링은 확대율에 따라 수 px의 서브픽셀 반올림이 생길 수 있다.
    // 지도와 마커의 동일 좌표계 계약을 유지하면서 실제 브라우저 오차만 허용한다.
    expect(Math.abs(centerX - expectedX)).toBeLessThan(SUBPIXEL_TOLERANCE);
    expect(Math.abs(centerY - expectedY)).toBeLessThan(SUBPIXEL_TOLERANCE);
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
