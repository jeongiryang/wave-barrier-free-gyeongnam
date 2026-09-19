import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { deliverFacility, facilityPlace, facilityRequests, openFacilityPanel } from "./facility-layer-fixtures";
import { derivedFacilityLayers, officialFacilityLayers, placeSearchFacilityLayers } from "../features/routing/constants";

const CODES = { food: "FD6", cafe: "CE7", store: "CS2", pharmacy: "PM9", hospital: "HP8", subway: "SW8" };

test("두 레이어를 동시에 켜면 두 종류의 마커가 지도에 함께 보인다", async ({ page }) => {
  const panel = await openFacilityPanel(page);

  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  await deliverFacility(page, CODES.food, "OK", [facilityPlace(CODES.food, 1, "식당")]);
  await panel.getByRole("button", { name: "카페", exact: true }).click();
  await deliverFacility(page, CODES.cafe, "OK", [facilityPlace(CODES.cafe, 2, "카페")]);

  // 각 레이어는 자기 요청만 한 번씩 보낸다. 이미 받은 레이어를 다시 부르지 않는다.
  expect(await facilityRequests(page)).toEqual([CODES.food, CODES.cafe]);

  const markers = page.locator("#route-map-canvas [data-facility-layer]");
  await expect(markers).toHaveCount(2);
  await expect(page.locator('[data-facility-layer="food"]')).toHaveCount(1);
  await expect(page.locator('[data-facility-layer="cafe"]')).toHaveCount(1);

  // 종류는 색이 아니라 읽히는 이름과 글자로 구분된다.
  await expect(page.locator('[data-facility-layer="food"]')).toHaveAccessibleName("음식점 식당 1");
  await expect(page.locator('[data-facility-layer="cafe"]')).toHaveAccessibleName("카페 카페 2");

  // 켜짐은 aria-pressed 와 칩 목록으로 함께 알린다.
  await expect(panel.getByRole("button", { name: "음식점", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(panel.locator(".facility-chip")).toHaveCount(2);
  await expect(panel.locator(".facility-evidence")).toHaveText("표시된 편의시설은 공공데이터에 등록된 정보예요. 실시간 이용 가능 여부와 현장 상태는 확인되지 않았어요.");
});

test("다섯 번째 선택은 거부되고 켜진 레이어는 그대로 남으며 안내가 읽힌다", async ({ page }) => {
  const panel = await openFacilityPanel(page);
  const names = ["음식점", "카페", "편의점", "약국"] as const;
  const codes = [CODES.food, CODES.cafe, CODES.store, CODES.pharmacy];
  for (let index = 0; index < names.length; index++) {
    await panel.getByRole("button", { name: names[index], exact: true }).click();
    await deliverFacility(page, codes[index], "OK", [facilityPlace(codes[index], index + 1)]);
  }
  await expect(panel.locator(".facility-chip")).toHaveCount(4);

  await panel.getByRole("button", { name: "병원", exact: true }).click();

  const notice = panel.locator(".facility-notice");
  await expect(notice).toHaveAttribute("aria-live", "polite");
  await expect(notice).toHaveText("편의 표시는 한 번에 4개까지 볼 수 있어요.");
  await expect(panel.getByRole("button", { name: "병원", exact: true })).toHaveAttribute("aria-pressed", "false");
  // 켜진 레이어를 임의로 끄지 않는다. 요청도 나가지 않는다.
  await expect(panel.locator(".facility-chip")).toHaveCount(4);
  for (const name of names) await expect(panel.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await facilityRequests(page)).toEqual(codes);
  await expect(page.locator("#route-map-canvas [data-facility-layer]")).toHaveCount(4);
});

test("한 레이어의 실패가 다른 레이어의 결과를 지우지 않는다", async ({ page }) => {
  const panel = await openFacilityPanel(page);

  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  await deliverFacility(page, CODES.food, "OK", [facilityPlace(CODES.food, 1, "식당"), facilityPlace(CODES.food, 2, "식당")]);
  await expect(page.locator('[data-facility-layer="food"]')).toHaveCount(2);

  await panel.getByRole("button", { name: "카페", exact: true }).click();
  await deliverFacility(page, CODES.cafe, "ERROR");

  const failed = panel.locator(".facility-chip.failed");
  await expect(failed).toContainText("불러오지 못함");
  await expect(failed.getByRole("button", { name: "다시 시도", exact: true })).toBeVisible();
  // 성공한 레이어의 마커는 그대로다.
  await expect(page.locator('[data-facility-layer="food"]')).toHaveCount(2);

  await failed.getByRole("button", { name: "다시 시도", exact: true }).click();
  await deliverFacility(page, CODES.cafe, "OK", [facilityPlace(CODES.cafe, 3, "카페")]);
  await expect(panel.locator(".facility-chip.failed")).toHaveCount(0);
  await expect(page.locator('[data-facility-layer="food"]')).toHaveCount(2);
  await expect(page.locator('[data-facility-layer="cafe"]')).toHaveCount(1);
});

test("검색 결과 없음과 검색 실패를 다르게 적는다", async ({ page }) => {
  const panel = await openFacilityPanel(page);
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  await deliverFacility(page, CODES.food, "ZERO_RESULT");
  await expect(panel.locator(".facility-chip")).toContainText("검색 결과 없음");
  await expect(panel.locator(".facility-chip.failed")).toHaveCount(0);

  await panel.getByRole("button", { name: "카페", exact: true }).click();
  await deliverFacility(page, CODES.cafe, "ERROR");
  await expect(panel.locator(".facility-chip.failed")).toContainText("불러오지 못함");
});

test("60개를 넘는 마커는 가까운 곳만 그리고 그 사실을 알린다", async ({ page }) => {
  const panel = await openFacilityPanel(page);
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  // 카카오 응답은 한 번에 15개까지라 실제로는 레이어 4개를 합쳐야 60을 넘는다.
  // 여기서는 상한 동작만 보려고 한 레이어에 많은 결과를 넣는다.
  await deliverFacility(page, CODES.food, "OK", Array.from({ length: 70 }, (_, index) => facilityPlace(CODES.food, index + 1)));
  await expect(page.locator("#route-map-canvas [data-facility-layer]")).toHaveCount(60);
  await expect(panel.locator(".facility-notice")).toHaveText("가까운 60곳만 표시했어요.");
});

test("마커를 누르면 지도에서 보기와 도착지로 선택만 있는 카드가 열린다", async ({ page }) => {
  const panel = await openFacilityPanel(page);
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  await deliverFacility(page, CODES.food, "OK", [facilityPlace(CODES.food, 1, "식당")]);

  // 스텁 지도는 오버레이의 화면 위치를 실제 SDK 처럼 잡지 못한다. 마커의 좌표
  // 계산이 아니라 활성화 동작만 확인하려고 click 이벤트를 직접 보낸다.
  await page.locator('[data-facility-layer="food"]').dispatchEvent("click");
  const card = page.locator(".facility-card");
  await expect(card).toContainText("식당 1");
  await expect(card).toContainText("카카오 장소 검색");
  await expect(card.locator(".map-place-actions button")).toHaveText(["지도에서 보기", "도착지로 선택"]);
  // 실시간 이용 가능 여부를 제공한다고 적지 않는다.
  await expect(card).not.toContainText("실시간");
});

test("모두 끄기는 전부 지우고 패널을 닫아도 표시는 유지된다", async ({ page }) => {
  const panel = await openFacilityPanel(page);
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  await deliverFacility(page, CODES.food, "OK", [facilityPlace(CODES.food, 1)]);
  await expect(page.locator("[data-facility-layer]")).toHaveCount(1);

  await panel.getByRole("button", { name: "편의 표시 닫기", exact: true }).click();
  await expect(panel).toBeHidden();
  await expect(page.locator("#route-map-canvas [data-facility-layer]")).toHaveCount(1);

  await page.locator('.map-command-bar button[aria-controls="map-panel-facility"]').click();
  await panel.getByRole("button", { name: "모두 끄기", exact: true }).click();
  await expect(page.locator("[data-facility-layer]")).toHaveCount(0);
  await expect(panel.locator(".facility-chip")).toHaveCount(0);
});

test("공식 데이터 레이어가 하나도 없으면 그 구분을 그리지 않는다", async ({ page }) => {
  const panel = await openFacilityPanel(page);
  await expect(panel.getByRole("heading", { name: "장소 검색", exact: true })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "공식 공공데이터", exact: true })).toHaveCount(0);
  // 범례는 글자로 남되, 등록되지 않은 공식 레이어의 버튼 구분은 그리지 않는다.
  await expect(panel.getByRole("heading", { name: "마커 범례", exact: true })).toBeVisible();
  // 등록된 레이어가 없는 구분(공식 공공데이터)만 그리지 않는지 확인한다. 파생
  // 레이어(스펙 20 안내견, 스펙 14 점자블록 등)는 등록돼 있으면 그려지므로
  // 그룹 수를 특정 값으로 고정하지 않고, 실제 레이어가 있는 구분 수와 맞춰 본다.
  const expectedGroups = [placeSearchFacilityLayers, officialFacilityLayers, derivedFacilityLayers].filter((layers) => layers.length > 0).length;
  await expect(panel.locator(".map-tool-grid")).toHaveCount(expectedGroups);
});

test("키보드만으로 패널을 열고 레이어를 켜고 마커로 초점을 옮길 수 있다", async ({ page }) => {
  const panel = await openFacilityPanel(page);
  const food = panel.getByRole("button", { name: "음식점", exact: true });
  await food.focus();
  await page.keyboard.press("Enter");
  await deliverFacility(page, CODES.food, "OK", [facilityPlace(CODES.food, 1, "식당")]);
  await expect(food).toHaveAttribute("aria-pressed", "true");

  const marker = page.locator('[data-facility-layer="food"]');
  await marker.focus();
  await expect(marker).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".facility-card")).toContainText("식당 1");

  // 다른 레이어가 도착해 지도를 다시 그려도 초점은 같은 마커로 돌아온다.
  // (레이어 버튼을 누른 뒤 마커로 초점을 옮겨 두고, 그 다음에 응답을 준다.)
  await panel.getByRole("button", { name: "카페", exact: true }).click();
  await marker.focus();
  await expect(marker).toBeFocused();
  await deliverFacility(page, CODES.cafe, "OK", [facilityPlace(CODES.cafe, 2, "카페")]);
  await expect(page.locator('[data-facility-layer="cafe"]')).toHaveCount(1);
  await expect(marker).toBeFocused();
});

test("편의 표시 패널에 axe 위반이 없다", async ({ page }) => {
  const panel = await openFacilityPanel(page);
  await panel.getByRole("button", { name: "음식점", exact: true }).click();
  await deliverFacility(page, CODES.food, "OK", [facilityPlace(CODES.food, 1, "식당")]);
  await panel.getByRole("button", { name: "카페", exact: true }).click();
  await deliverFacility(page, CODES.cafe, "ERROR");
  // 스텁 지도는 오버레이의 화면 위치를 실제 SDK 처럼 잡지 못한다. 마커의 좌표
  // 계산이 아니라 활성화 동작만 확인하려고 click 이벤트를 직접 보낸다.
  await page.locator('[data-facility-layer="food"]').dispatchEvent("click");

  const results = await new AxeBuilder({ page }).include("#map-panel-facility").analyze();
  expect(results.violations).toEqual([]);
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 960, height: 900 }, { width: 390, height: 844 }]) {
  test(`${viewport.width}px 에서 패널이 넘치지 않고 조작 영역이 44px 이상이다`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const panel = await openFacilityPanel(page);
    await panel.getByRole("button", { name: "음식점", exact: true }).click();
    await deliverFacility(page, CODES.food, "OK", [facilityPlace(CODES.food, 1, "식당")]);
    // 스텁 지도는 오버레이의 화면 위치를 실제 SDK 처럼 잡지 못한다. 마커의 좌표
  // 계산이 아니라 활성화 동작만 확인하려고 click 이벤트를 직접 보낸다.
  await page.locator('[data-facility-layer="food"]').dispatchEvent("click");

    const overflow = await panel.evaluate((node) => ({
      wider: node.scrollWidth > node.clientWidth + 1,
      right: node.getBoundingClientRect().right > window.innerWidth + 1,
    }));
    expect(overflow).toEqual({ wider: false, right: false });

    const marker = await page.locator('[data-facility-layer="food"]').boundingBox();
    expect(marker!.width).toBeGreaterThanOrEqual(44);
    expect(marker!.height).toBeGreaterThanOrEqual(44);
    for (const action of await panel.locator(".map-place-actions button").all()) {
      const box = await action.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    for (const layer of await panel.locator(".map-tool-grid > button").all()) {
      const box = await layer.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
}
