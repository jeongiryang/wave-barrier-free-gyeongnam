import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { deliverFacility, facilityPlace, openFacilityPanel } from "./facility-layer-fixtures";

const response = {
  status: "available", contentId: "1001", checkedAt: "2026-09-20T00:00:00.000Z", source: "창원시 공식 가로휴지통 데이터",
  items: [{ id: "B1", kind: "일반·재활용", locationNote: "경상남도 창원시 중앙대로 · 정류장 옆", distanceMeters: 128, destination: { latitude: 35.231, longitude: 128.681 }, referenceDate: "2026-04-15" }],
};

async function setup(page: Page) {
  let calls = 0;
  await page.route("**/api/wave?action=trash-bin*", route => { calls++; return route.fulfill({ status: 200, json: response }); });
  const panel = await openFacilityPanel(page);
  return { panel, calls: () => calls };
}

test("선택 전 요청하지 않고 공식 쓰레기통의 근거와 설치 미확인을 표시한다", async ({ page }) => {
  const { panel, calls } = await setup(page);
  expect(calls()).toBe(0);
  await panel.getByRole("button", { name: "쓰레기통", exact: true }).click();
  await expect.poll(calls).toBe(1);
  const marker = page.locator('[data-facility-layer="trash-bin"]');
  await expect(marker).toHaveCount(1);
  await expect(marker).toHaveAccessibleName("쓰레기통 일반·재활용");
  await expect(panel.locator(".facility-evidence")).toHaveText("공공데이터에 등록된 위치예요. 현재 설치 여부는 확인되지 않았어요.");

  await marker.dispatchEvent("click");
  const card = panel.locator(".facility-card");
  await expect(card).toContainText("일반·재활용");
  await expect(card).toContainText("정류장 옆");
  await expect(card).toContainText("여행지 기준 직선거리");
  await expect(card).toContainText("2026-04-15");
  await expect(card).toContainText("창원시 공식 가로휴지통 데이터");
  await expect(card.getByRole("button", { name: "도착지로 선택" })).toHaveCount(0);
  const box = await marker.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const glyph = await marker.locator(".facility-pin-glyph").boundingBox();
  expect(glyph!.width).toBeLessThan(box!.width);
  const axe = await new AxeBuilder({ page }).include("#map-panel-facility").analyze();
  expect(axe.violations).toEqual([]);
});

test("다른 레이어와 함께 켜도 기존 마커를 유지한다", async ({ page }) => {
  const { panel } = await setup(page);
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  await deliverFacility(page, "FD6", "OK", [facilityPlace("FD6", 1, "식당")]);
  await panel.getByRole("button", { name: "쓰레기통", exact: true }).click();
  await expect(page.locator('[data-facility-layer="food"]')).toHaveCount(1);
  await expect(page.locator('[data-facility-layer="trash-bin"]')).toHaveCount(1);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 960, height: 900 }, { width: 1440, height: 900 }]) {
  test(`${viewport.width}px 쓰레기통 패널에 가로 넘침이 없다`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const { panel } = await setup(page);
    await panel.getByRole("button", { name: "쓰레기통", exact: true }).click();
    await expect(page.locator('[data-facility-layer="trash-bin"]')).toHaveCount(1);
    expect(await panel.evaluate(node => node.scrollWidth > node.clientWidth + 1)).toBe(false);
  });
}
