import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

/**
 * `scrollIntoView`에 넘긴 behavior는 CSS `scroll-behavior`를 이긴다. 스타일시트가
 * reduced-motion에서 `scroll-behavior: auto`를 걸어도, 코드가 "smooth"를 그대로
 *넘기면 사용자가 끈 애니메이션이 그대로 돈다. 실제 이동 궤적으로 확인한다.
 */
async function scrollPositionsAfter(page: import("@playwright/test").Page, action: () => Promise<void>) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  await action();
  const positions: number[] = [];
  for (let index = 0; index < 12; index += 1) {
    positions.push(await page.evaluate(() => Math.round(window.scrollY)));
    await page.waitForTimeout(40);
  }
  return positions;
}

test("움직임 줄이기를 켜면 여행지 이동이 애니메이션 없이 끝난다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();

  const positions = await scrollPositionsAfter(page, async () => {
    await page.getByRole("button", { name: "이곳까지 길찾기" }).first().click();
  });

  // 즉시 이동이면 첫 표본이 이미 최종 위치다. 중간 단계가 남으면 애니메이션이 돈 것이다.
  expect(new Set(positions).size).toBeLessThanOrEqual(2);
  expect(positions[0]).toBe(positions[positions.length - 1]);
});

test("기본 설정에서는 부드러운 이동을 유지한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();

  const positions = await scrollPositionsAfter(page, async () => {
    await page.getByRole("button", { name: "이곳까지 길찾기" }).first().click();
  });

  expect(new Set(positions).size).toBeGreaterThan(2);
});
