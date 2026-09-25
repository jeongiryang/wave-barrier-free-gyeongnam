import { openNaruTool } from './naru-tool-fixtures';
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";

/** Test the labels a visitor reads, without requiring retired step numbers or
 * repeating clicks to hide a control that is enabled before hydration. */
async function openPlanner(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/planner");
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toBeEnabled();
}

async function collectMuseum(page: Page) {
  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
}

async function expectKoreanHeadings(page: Page) {
  const headings = await page.getByRole("main").locator("h1:visible, h2:visible").allInnerTexts();
  expect(headings.length).toBeGreaterThan(0);
  for (const heading of headings) expect(heading.trim(), "한글이 한 글자도 없는 제목").toMatch(/[가-힣]/);
}

test("검색과 여행 설정의 필드 라벨이 중복 단계 번호로 시작하지 않는다", async ({ page }) => {
  await openPlanner(page);
  const labels = await page.locator(".simple-search-bar label > span").allInnerTexts();
  await collectMuseum(page);
  await page.locator(".wave-header").locator(".wave-my-trips").click();
  await expect(page.locator(".simple-initial-setup")).toBeVisible();
  labels.push(...await page.locator(".simple-settings-fields > label").evaluateAll(nodes => nodes.map(node => node.firstChild?.textContent?.trim() || "")));
  expect(labels).toEqual(["지역", "시작일", "마지막 날", "이동 수단", "하루 시작"]);
  for (const label of labels) expect(label.trim(), "화면 단계 번호와 겹치는 자체 번호").not.toMatch(/^\d/);
});

test("편의 선택 전·초안·적용·해제의 문구가 완결되고 자동 검색에 그대로 반영된다", async ({ page }) => {
  await openPlanner(page);
  const searches: URL[] = [];
  page.on("request", request => { if (request.url().includes("action=plan")) searches.push(new URL(request.url())); });
  const trigger = page.locator(".simple-facility-trigger");
  await expect(trigger).toHaveAccessibleName("필요한 편의");
  await trigger.click();
  const picker = page.getByRole("dialog", { name: "필요한 편의", exact: true });
  await expect(picker.getByText("걷기·휴식·동행 조건", { exact: true })).toHaveCount(0);
  await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await picker.getByRole("checkbox", { name: "접근로", exact: true }).check();
  await expect(picker.getByRole("button", { name: "적용 · 1개", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"))).toEqual([]);
  await picker.getByRole("button", { name: "적용 · 1개", exact: true }).click();
  await expect(trigger).toHaveAccessibleName("필요한 편의 · 1개");
  expect(searches).toHaveLength(0);

  await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
  await expect(page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true })).toBeEnabled();
  expect(searches).toHaveLength(1);
  expect(searches[0].searchParams.get("facilityKeys")).toBe("route");
  await trigger.click();
  await picker.getByRole("button", { name: "선택 해제", exact: true }).click();
  await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await expect(picker.getByRole("button", { name: "적용", exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"))).toEqual(["route"]);
  await picker.getByRole("button", { name: "적용", exact: true }).click();
  await expect(trigger).toHaveAccessibleName("필요한 편의");
  await expect.poll(() => searches.length).toBe(2);
  expect(searches[1].searchParams.get("facilityKeys")).toBe("");
  await expect(page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true })).toBeEnabled();
});

test("지역·검색 결과·날짜 설정·내 일정과 출발 전 확인은 한국어로 읽힌다", async ({ page }) => {
  await openPlanner(page);
  await expect(page.getByRole("heading", { name: "경남, 모두의 여행지", exact: true })).toBeVisible();
  await expectKoreanHeadings(page);
  await collectMuseum(page);
  await expect(page.getByRole("heading", { name: "창원 여행지", exact: true })).toBeVisible();
  await expectKoreanHeadings(page);
  await page.locator(".wave-header").locator(".wave-my-trips").click();
  await expect(page.getByRole("heading", { name: "언제 떠날까요?", exact: true })).toBeVisible();
  await expectKoreanHeadings(page);
  await openItinerary(page, { start: "2026-09-20" });
  await expect(page.getByRole("heading", { name: "내 일정", exact: true })).toBeVisible();
  await expectKoreanHeadings(page);
  await openNaruTool(page, "출발 전 확인");
  await expect(page.getByRole("region", { name: "출발 전 확인할 정보", exact: true })).toBeVisible();
  await expectKoreanHeadings(page);
});
