import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

async function recordScrollIntoViewBehavior(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    const calls: Array<ScrollBehavior | "unspecified"> = [];
    Object.defineProperty(window, "__waveScrollBehaviors", { value: calls, configurable: true });
    Element.prototype.scrollIntoView = function scrollIntoView(arg?: boolean | ScrollIntoViewOptions) {
      calls.push(typeof arg === "object" && arg?.behavior ? arg.behavior : "unspecified");
      return original.call(this, arg as ScrollIntoViewOptions | boolean | undefined);
    };
  });
}

async function routeScrollBehavior(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const calls = (window as typeof window & { __waveScrollBehaviors?: Array<ScrollBehavior | "unspecified"> }).__waveScrollBehaviors ?? [];
    return calls.at(-1) ?? "unspecified";
  });
}

test("움직임 줄이기를 켜면 여행지 이동이 애니메이션 없이 끝난다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await recordScrollIntoViewBehavior(page);
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();

  await page.getByRole("button", { name: "길찾기" }).first().click();

  expect(await routeScrollBehavior(page)).toBe("auto");
});

test("기본 설정에서는 부드러운 이동을 유지한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await recordScrollIntoViewBehavior(page);
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await expect(page.getByRole("heading", { name: "경남도립미술관" }).first()).toBeVisible();

  await page.getByRole("button", { name: "길찾기" }).first().click();

  // 프레임 수/중간 scrollY 개수는 기기 성능에 따라 달라진다. 실제 제품 계약인
  // scrollIntoView의 behavior 인자를 검증해 빠른 CI에서도 결정적으로 확인한다.
  expect(await routeScrollBehavior(page)).toBe("smooth");
});
