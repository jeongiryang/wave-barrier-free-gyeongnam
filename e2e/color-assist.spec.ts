import { openSupportMenu } from "./support-menu";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, plan } from "./fixtures";
import { openNearby } from "./nearby-fixtures";

const accessibility = [
  { key: "route", label: "접근로", state: "confirmed", detail: "공식 접근로 기록" },
  { key: "restroom", label: "장애인 화장실", state: "unknown", detail: "" },
  { key: "elevator", label: "승강기", state: "negative", detail: "승강기 없음" },
];

async function toggleColorAssist(page: Page) {
  await openSupportMenu(page);
  const details = page.locator(".preference-controls");
  await expect(details).toHaveAttribute("aria-busy", "false");
  await details.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ }).click();
  const row = details.locator(".preference-row").filter({ hasText: "색 구분 보조" });
  await expect(row).toHaveCount(1);
  await row.click();
  await page.keyboard.press("Escape");
}

test("색 구분 보조를 켜면 편의 상태에 글자와 모양이 함께 보이고 새로고침 뒤에도 유지된다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: { ...plan, places: [{ ...plan.places[0], accessibility }] } }));
  await page.goto("/planner?region=창원");
  const card = page.locator(".simple-place-row").first();
  // 끈 상태에서도 색 없이 이해할 수 있어야 한다: 상태마다 글자가 이미 붙어 있다.
  await expect(card.locator(".facility-missing")).toHaveText("승강기 없음");
  await expect(card.locator(".facility-unknown")).toHaveText("장애인 화장실 정보 없음");
  await expect(page.locator("html")).toHaveAttribute("data-color-assist", "off");
  await expect(card.locator(".facility-missing .status-shape")).toBeHidden();

  await toggleColorAssist(page);
  await expect(page.locator("html")).toHaveAttribute("data-color-assist", "on");
  await expect(card.locator(".facility-missing .status-shape")).toBeVisible();
  await expect(card.locator(".facility-unknown .status-shape")).toBeVisible();
  await expect(card.locator(".facility-confirmed .status-shape")).toBeVisible();
  await expect(card.locator(".facility-missing")).toHaveText("승강기 없음");
  await expect(card.locator(".facility-unknown")).toHaveText("장애인 화장실 정보 없음");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-color-assist", "on");
  await expect(page.locator(".simple-place-row").first().locator(".facility-missing .status-shape")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  await toggleColorAssist(page);
  await expect(page.locator("html")).toHaveAttribute("data-color-assist", "off");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-color-assist", "off");
  expect(errors).toEqual([]);
});

test("저장소가 막혀도 화면이 동작하고 색 구분 보조는 기본값으로 시작한다", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: { ...plan, places: [{ ...plan.places[0], accessibility }] } }));
  await page.addInitScript(() => {
    const blocked = () => { throw new DOMException("storage blocked", "SecurityError"); };
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => ({ getItem: blocked, setItem: blocked, removeItem: blocked, clear: blocked, key: blocked, length: 0 }) });
  });
  await page.goto("/planner?region=창원");
  const card = page.locator(".simple-place-row").first();
  await expect(card.locator(".facility-missing")).toHaveText("승강기 없음");
  await expect(page.locator("html")).not.toHaveAttribute("data-color-assist", "on");
  // 저장하지 못해도 이번 탭에서는 설정이 즉시 반영돼야 한다.
  await toggleColorAssist(page);
  await expect(page.locator("html")).toHaveAttribute("data-color-assist", "on");
  await expect(card.locator(".facility-missing .status-shape")).toBeVisible();
  expect(errors).toEqual([]);
});

test("색 구분 보조를 켜도 혼잡도 표시는 글자를 그대로 유지한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openNearby(page);
  await page.getByRole("button", { name: "주변 장소 닫기", exact: true }).click();
  const legend = page.locator(".map-crowd-legend");
  await expect(legend).toContainText("여유");
  await toggleColorAssist(page);
  await expect(page.locator("html")).toHaveAttribute("data-color-assist", "on");
  await expect(legend).toContainText("여유");
  await expect(legend.locator("strong")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});
