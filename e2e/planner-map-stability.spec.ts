import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

/**
 * 지도는 추천 결과가 실제로 바뀔 때만 다시 만들어야 한다. 렌더마다 새 배열을
 * 넘기면 스크롤로 헤더가 접히기만 해도 인스턴스가 파괴되고, 사용자가 맞춰 둔
 * 확대·이동과 지도 위에 그린 측정 도형이 함께 사라진다.
 */
test("스크롤은 지도를 다시 만들지 않는다", async ({ page }) => {
  await mockPlannerApi(page);
  let mapConfigCalls = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/map-config") mapConfigCalls += 1;
  });

  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();
  const canvas = page.locator(".route-map-canvas");
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1500);

  // 살아 있는 지도 인스턴스에 표시를 남긴다. 재생성되면 컨테이너 내용이
  // 통째로 교체되므로 이 표시가 사라진다.
  await page.evaluate(() => {
    const node = document.querySelector(".route-map-canvas");
    if (node?.firstElementChild) (node.firstElementChild as HTMLElement).dataset.waveMapProbe = "1";
  });
  await expect(page.locator(".route-map-canvas [data-wave-map-probe]")).toHaveCount(1);
  const callsBeforeScroll = mapConfigCalls;

  // 플래너 헤더가 접혔다 펴지도록 위아래로 움직인다.
  for (let index = 0; index < 4; index += 1) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(220);
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(220);
  }
  await page.waitForTimeout(1200);

  expect(mapConfigCalls - callsBeforeScroll).toBe(0);
  await expect(page.locator(".route-map-canvas [data-wave-map-probe]")).toHaveCount(1);
});
