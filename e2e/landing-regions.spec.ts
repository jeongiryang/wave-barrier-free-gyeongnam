import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test("경남 18개 지역 표식이 지도와 같은 좌표계 안에 유지된다", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/");
  await page.evaluate(async () => { await document.fonts.ready; });

  const map = page.locator("[data-region-map-canvas]");
  await expect(map).toBeVisible();
  const mapContract = await map.evaluate((element) => {
    const item = element as HTMLElement;
    return {
      width: item.getBoundingClientRect().width,
      height: item.getBoundingClientRect().height,
    };
  });
  expect(mapContract.width).toBeGreaterThan(0);
  expect(mapContract.height).toBeGreaterThan(0);
  expect(mapContract.width / mapContract.height).toBeCloseTo(600 / 433, 2);

  const markers = page.locator("[data-region-marker]");
  await expect(markers).toHaveCount(18);

  const positions: Record<string, { x: number; y: number }> = {};
  for (let index = 0; index < 18; index += 1) {
    const marker = markers.nth(index);
    const contract = await marker.evaluate((element) => {
      const item = element as HTMLElement;
      const parent = item.parentElement;
      return {
        name: item.dataset.regionMarker || "",
        x: Number(item.dataset.regionX),
        y: Number(item.dataset.regionY),
        inlineLeft: item.style.left,
        inlineTop: item.style.top,
        parentIsCanvas: parent?.hasAttribute("data-region-map-canvas") ?? false,
      };
    });

    // 절대배치/translate CSS 자체는 정적 회귀가 고정한다. 여기서는 hydration 뒤에도
    // 18개 버튼이 지도 캔버스의 직접 자식이며 같은 % 좌표를 유지하는지 검증한다.
    expect(contract.parentIsCanvas).toBe(true);
    expect(contract.inlineLeft).toBe(`${contract.x}%`);
    expect(contract.inlineTop).toBe(`${contract.y}%`);
    expect(contract.x).toBeGreaterThan(0);
    expect(contract.x).toBeLessThan(100);
    expect(contract.y).toBeGreaterThan(0);
    expect(contract.y).toBeLessThan(100);
    positions[contract.name] = { x: contract.x, y: contract.y };
  }

  expect(positions["거창"].x).toBeLessThan(positions["합천"].x);
  expect(positions["합천"].x).toBeLessThan(positions["창녕"].x);
  expect(positions["창녕"].x).toBeLessThan(positions["양산"].x);
  expect(positions["거창"].y).toBeLessThan(positions["남해"].y);
});
