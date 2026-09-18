import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";

const MOBILE = { width: 390, height: 844 };

/** 가로로 밀어야 보이는 목록을 센다. 한 손으로는 가로 스크롤을 쓰기 어렵다. */
const horizontalScrollers = (page: Page) => page.evaluate(() => [...document.querySelectorAll("*")].filter(node => {
  const element = node as HTMLElement;
  if (!element.clientWidth || element.scrollWidth <= element.clientWidth + 1) return false;
  const overflowX = getComputedStyle(element).overflowX;
  return overflowX === "auto" || overflowX === "scroll";
}).map(node => `${(node as HTMLElement).tagName}.${((node as HTMLElement).className || "").toString().split(" ")[0]}`));

async function openPlanner(page: Page, width = MOBILE.width) {
  await page.setViewportSize({ width, height: MOBILE.height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/planner");
  await chooseTripConditions(page);
}

const placeDialog = (page: Page) => page.getByRole("dialog", { name: "경남도립미술관", exact: true });

test("390px 장소 상세는 내용 맨 아래에도 닫기를 두고 초점을 가둔다", async ({ page }) => {
  await openPlanner(page);
  await page.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true }).click();
  const dialog = placeDialog(page);
  await expect(dialog.getByRole("heading").first()).toBeFocused();

  // 위 닫기는 습관대로 그대로 둔다.
  const topClose = dialog.locator(".modal-close");
  await expect(topClose).toBeVisible();
  await expect(topClose).toHaveAttribute("aria-label", "닫기");

  // 아래 닫기는 같은 접근 가능한 이름을 가지며 엄지가 닿는 내용 맨 아래에 있다.
  const bottomClose = dialog.locator(".modal-close-end > button");
  await expect(bottomClose).toBeVisible();
  await expect(bottomClose).toHaveText("닫기");
  await expect(dialog.getByRole("button", { name: "닫기", exact: true })).toHaveCount(2);
  expect((await bottomClose.boundingBox())!.height, "흔들리는 상황에서 누르므로 48px 이상").toBeGreaterThanOrEqual(48);

  // 아래 닫기를 화면에 띄우면 화면 하단 3분의 1 안에 들어온다.
  await bottomClose.scrollIntoViewIfNeeded();
  const placed = await bottomClose.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const viewport = (element.closest("dialog") as HTMLElement).getBoundingClientRect();
    return { centre: (rect.top + rect.height / 2 - viewport.top) / viewport.height };
  });
  expect(placed.centre, "아래 닫기는 dialog 하단 3분의 1 안에 있어야 한다").toBeGreaterThan(2 / 3);

  // 아래 닫기가 초점 순서의 마지막이고 Tab 으로 dialog 를 벗어나지 않는다.
  await bottomClose.focus();
  await expect(bottomClose).toBeFocused();
  await page.keyboard.press("Tab");
  const stillInside = await page.evaluate(() => Boolean(document.activeElement?.closest("dialog")));
  expect(stillInside, "Tab 으로 dialog 를 벗어나면 안 된다").toBe(true);
  await expect(topClose).toBeFocused();

  expect((await new AxeBuilder({ page }).include(".native-place-dialog").analyze()).violations).toEqual([]);

  // 두 버튼은 같은 동작이다.
  await bottomClose.click();
  await expect(dialog).toHaveCount(0);
});

for (const width of [768, 960, 1440]) {
  test(`${width}px 배치는 그대로다. 아래 닫기가 보이지 않고 초점 순서에도 없다`, async ({ page }) => {
    await openPlanner(page, width);
    await page.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true }).click();
    const dialog = placeDialog(page);
    await expect(dialog.locator(".modal-close")).toBeVisible();
    // display:none 이므로 그려지지 않고 Tab 순서에도 들어가지 않는다.
    await expect(dialog.locator(".modal-close-end > button")).toBeHidden();
    await expect(dialog.getByRole("button", { name: "닫기", exact: true })).toHaveCount(1);
    expect((await new AxeBuilder({ page }).include(".native-place-dialog").analyze()).violations).toEqual([]);
  });
}

test("390px 주요 화면에 가로로 밀어야 보이는 목록이 없다", async ({ page }) => {
  await openPlanner(page);
  expect(await horizontalScrollers(page), "여행지 찾기").toEqual([]);

  await page.getByRole("button", { name: "경남도립미술관 상세 보기", exact: true }).click();
  await expect(placeDialog(page)).toBeVisible();
  expect(await horizontalScrollers(page), "장소 상세 dialog").toEqual([]);
  await page.keyboard.press("Escape");
  await expect(placeDialog(page)).toHaveCount(0);

  await page.locator(".simple-place-row").first().locator(".simple-place-add").click();
  await openItinerary(page);
  expect(await horizontalScrollers(page), "내 일정").toEqual([]);

  await page.goto("/travel-book");
  await expect(page.locator("main")).toBeVisible();
  expect(await horizontalScrollers(page), "/travel-book").toEqual([]);

  // 가로 스크롤이 없으니 화면 자체도 가로로 밀리지 않는다.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});
