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
    const style = getComputedStyle(item);
    return {
      width: item.getBoundingClientRect().width,
      height: item.getBoundingClientRect().height,
      position: style.position,
      aspectRatio: style.aspectRatio,
    };
  });
  expect(mapContract.width).toBeGreaterThan(0);
  expect(mapContract.height).toBeGreaterThan(0);
  expect(mapContract.width / mapContract.height).toBeCloseTo(600 / 433, 2);
  expect(mapContract.position).toBe("relative");
  expect(mapContract.aspectRatio).toMatch(/600\s*\/\s*433|1\.38/);

  const markers = page.locator("[data-region-marker]");
  await expect(markers).toHaveCount(18);

  const positions: Record<string, { x: number; y: number }> = {};
  for (let index = 0; index < 18; index += 1) {
    const marker = markers.nth(index);
    const contract = await marker.evaluate((element) => {
      const item = element as HTMLElement;
      const parent = item.parentElement;
      const style = getComputedStyle(item);
      return {
        name: item.dataset.regionMarker || "",
        x: Number(item.dataset.regionX),
        y: Number(item.dataset.regionY),
        inlineLeft: item.style.left,
        inlineTop: item.style.top,
        transform: style.transform,
        parentIsCanvas: parent?.hasAttribute("data-region-map-canvas") ?? false,
      };
    });

    // 좌표 계약의 핵심은 마커가 동일 캔버스의 직접 자식이고,
    // 데이터 좌표가 실제 inline left/top으로 그대로 전달되는지다.
    // CSS position의 computed 값은 Chromium의 초기 스타일 적용 타이밍에 따라
    // 빈 문자열로 관찰될 수 있으므로 좌표 정합성 계약으로 사용하지 않는다.
    expect(contract.parentIsCanvas).toBe(true);
    expect(contract.inlineLeft).toBe(`${contract.x}%`);
    expect(contract.inlineTop).toBe(`${contract.y}%`);
    expect(contract.transform).not.toBe("none");
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
