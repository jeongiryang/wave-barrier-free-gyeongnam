import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = []; errors.set(page, messages);
  page.on("pageerror", error => messages.push(error.message));
  page.on("console", message => { if (message.type() === "error") messages.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]); });

async function prepare(page: Page, en = false) {
  await page.setViewportSize({ width: test.info().project.name === "mobile-chromium" ? 390 : 1366, height: 900 });
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.addInitScript(value => localStorage.setItem("wave-locale", value), en ? "en" : "ko");
  await page.goto("/planner");
  await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>(".journey-mode-toggle button")?.disabled);
  await page.getByRole("group", { name: en ? "Choose a region" : "여행 지역 선택", exact: true }).getByRole("button", { name: en ? "Changwon" : "창원", exact: true }).click();
  const next = page.locator(".condition-actions").getByRole("button", { name: en ? "Continue →" : "다음 →", exact: true });
  await next.click();
  await page.getByRole("button", { name: en ? /Wheelchair facilities/ : /휠체어 편의시설/ }).click();
  await next.click();
  await page.getByRole("button", { name: en ? /Nature/ : /자연·휴양 공원/ }).click();
  await next.click();
  return page.locator(".condition-actions").getByRole("button").last();
}

for (const en of [false, true]) {
test(`keyboard search moves focus to the displayed results and synchronizes the URL ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  await search.focus();
  await search.press("Enter");
  await expect(page.locator("#places")).toBeVisible();
  await expect(page.locator("#places h2").first()).toBeFocused();
  await expect(page).toHaveURL(/#places$/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#places h2").first()).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: test.info().outputPath("search-results-visible.png") });
  await page.goBack();
  await expect(page.locator(".condition-heading")).toBeFocused();
  await expect(page).toHaveURL(/question=3#conditions$/);
});

test(`a delayed search does not hide the question the user returned to ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started = false;
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") === "plan") { started = true; await gate; }
    await route.fallback();
  });
  await search.focus();
  await search.press("Enter");
  await expect.poll(() => started).toBe(true);
  await page.locator(".condition-progress button").first().click();
  const heading = page.getByRole("heading", { name: en ? "Where would you like to go?" : "어디로 갈까요?", exact: true });
  await expect(heading).toBeFocused();
  release();
  await expect(page.locator(".journey-rail nav button").nth(1)).toBeEnabled();
  await expect(heading).toBeVisible();
  await expect(heading).toBeFocused();
  await expect(page).toHaveURL(/question=0#conditions$/);
});

test(`keyboard next step focuses the displayed itinerary heading ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  await search.click();
  await page.getByRole("button", { name: en ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
  const next = page.getByRole("button", { name: en ? /Next: Itinerary/ : /다음: 내 일정/ });
  await next.focus();
  await next.press("Enter");
  await expect(page.locator("#itinerary")).toBeVisible();
  await expect(page.locator("#itinerary-stage-title")).toBeFocused();
});

test(`a pending search keeps its keyboard focus ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let started = false;
  let requests = 0;
  await page.route("**/api/wave?*", async route => {
    if (new URL(route.request().url()).searchParams.get("action") === "plan") { started = true; requests++; await gate; }
    await route.fallback();
  });
  await search.focus();
  await search.press("Enter");
  await expect.poll(() => started).toBe(true);
  try {
    await expect(search).toBeFocused();
    await expect(search).toHaveAttribute("aria-disabled", "true");
    await search.press("Enter");
    expect(requests).toBe(1);
  }
  finally { release(); }
  await expect(page.locator("#places h2").first()).toBeFocused();
});

for (const end of ["cancel", "complete", "elsewhere"] as const) test(`all-journey ${end} preserves the user's focus ${en ? "English" : "Korean"}`, async ({ page }) => {
  const search = await prepare(page, en);
  await search.click();
  await page.getByRole("button", { name: en ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
  await page.getByRole("button", { name: en ? /Next: Itinerary/ : /다음: 내 일정/ }).click();
  await expect(page.locator(".route-options")).toHaveAttribute("aria-busy", "false");
  const coverage = page.locator(".itinerary-route-coverage");
  const check = coverage.locator(".coverage-actions button").first();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await page.route("**/api/route?*", async route => { requests++; await gate; await route.fallback(); });
  await check.focus();
  await check.press("Enter");
  try {
    await expect.poll(() => requests).toBe(1);
    await expect(check).toBeFocused();
    await expect(check).toHaveAttribute("aria-disabled", "true");
    await check.press("Enter");
    expect(requests).toBe(1);
    await check.press("Tab");
    const cancel = coverage.getByRole("button", { name: en ? "Cancel" : "확인 중단", exact: true });
    await expect(cancel).toBeFocused();
    if (end === "cancel") await cancel.press("Enter");
    if (end === "elsewhere") await coverage.getByRole("combobox").focus();
  } finally { release(); }
  await expect(check).not.toHaveAttribute("aria-busy", "true");
  if (end === "elsewhere") await expect(coverage.getByRole("combobox")).toBeFocused();
  else await expect(check).toBeFocused();
  if (end === "cancel") {
    await expect(coverage.getByRole("checkbox")).toBeDisabled();
    await check.press("Enter");
  }
  await expect(coverage.getByRole("status")).toHaveText(en ? "1 of 1 journeys found for this transport" : "선택한 이동수단: 전체 1구간 중 1구간 확인");
  expect((await new AxeBuilder({ page }).include(".itinerary-route-coverage").analyze()).violations).toEqual([]);
});
}
