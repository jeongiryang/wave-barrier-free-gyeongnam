import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

async function openPlanner(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/planner");
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toBeEnabled();
}

async function currentTrip(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return { ids: JSON.parse(values["wave-saved-places"] || "[]"), schedule: JSON.parse(values["wave-trip-schedule-v1"] || "{}"), facilities: JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]") };
  });
}

test("데스크톱의 두 화면 전환은 현재 상태·다음 행동과 키보드 초점을 제공한다", async ({ page }) => {
  await openPlanner(page, 1366, 900);
  const tabs = page.getByRole("group", { name: "여행 설계 화면", exact: true });
  await expect(tabs.getByRole("button")).toHaveCount(2);
  await expect(tabs.getByRole("button", { name: "여행지 찾기", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(tabs.getByRole("button", { name: /^내 일정/ })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "경남, 모두의 여행지", exact: true })).toBeVisible();

  const region = page.getByRole("button", { name: "통영 지역 선택", exact: true });
  await region.focus();
  await expect(region).toBeFocused();
  const focusStyle = await region.evaluate(element => {
    const style = getComputedStyle(element);
    return { width: Number.parseFloat(style.outlineWidth), type: style.outlineStyle };
  });
  expect(focusStyle.width).toBeGreaterThanOrEqual(3);
  expect(focusStyle.type).toBe("solid");

  await openSupportMenu(page);
  const preference = page.locator("details.preference-controls");
  await preference.locator("summary").press("Enter");
  const language = preference.getByLabel("언어");
  await expect(language).toBeVisible();
  expect((await language.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const results = await new AxeBuilder({ page }).include(".planner-journey-workspace").analyze();
  expect(results.violations.filter(item => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("모바일 두 화면 전환과 선택은 44px 탐색과 수평 안전 영역을 유지한다", async ({ page }) => {
  await openPlanner(page, 390, 844);
  const tabs = page.getByRole("group", { name: "여행 설계 화면", exact: true });
  await expect(tabs).toBeVisible();
  expect(await tabs.evaluate(element => getComputedStyle(element).position)).not.toBe("fixed");
  const buttons = tabs.getByRole("button");
  await expect(buttons).toHaveCount(2);
  for (const button of [...await buttons.all(), page.getByRole("button", { name: "필요한 편의", exact: true })]) {
    const size = (await button.boundingBox())!;
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator(".simple-region-entry .simple-region")).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
});

test("검색과 내 일정 전환은 같은 장소·필수 편의·날짜 미정 상태를 유지한다", async ({ page }) => {
  await openPlanner(page, 1366, 900);
  const tabs = page.getByRole("group", { name: "여행 설계 화면", exact: true });
  await expect(page.locator("#places")).toHaveCount(0);
  await expect(tabs.getByRole("button", { name: /^내 일정/ })).toBeDisabled();
  await page.getByRole("button", { name: "필요한 편의", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await picker.getByRole("checkbox", { name: "접근로", exact: true }).check();
  await picker.getByRole("button", { name: "적용 · 1개", exact: true }).click();
  await page.getByRole("button", { name: "창원 지역 선택", exact: true }).press("Enter");
  await expect(page.locator("#conditions")).toBeVisible();
  await expect(page.locator("#places")).toBeVisible();
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  const before = await currentTrip(page);
  expect(before.ids).toEqual(["1001"]);
  expect(before.facilities).toEqual(["route"]);
  expect(before.schedule).toMatchObject({ travelStart: "", travelEnd: "", scheduleAssignments: {} });

  await tabs.getByRole("button", { name: /^내 일정/ }).press("Enter");
  await expect(tabs.getByRole("button", { name: /^내 일정/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".simple-initial-setup")).toContainText("경남도립미술관");
  await expect(page.locator(".simple-browse-view")).toBeHidden();
  expect(await currentTrip(page)).toEqual(before);
  await tabs.getByRole("button", { name: "여행지 찾기", exact: true }).press("Enter");
  await expect(tabs.getByRole("button", { name: "여행지 찾기", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#conditions")).toBeVisible();
  await expect(page.locator("#places")).toBeVisible();
  await expect(page.getByRole("button", { name: "경남도립미술관 담았음 · 되돌리기", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "필요한 편의 · 1개", exact: true })).toBeVisible();
  expect(await currentTrip(page)).toEqual(before);
});
