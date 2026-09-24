import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { prepareStory, storyReady, firstRegions, expectNoOverflow } from "./landing-contract";

test("compact browsing preserves an existing undated trip when replacing the old overview preference", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.goto("/planner");
  const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(region).toBeEnabled(); await region.selectOption("창원");
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  const saved = await page.evaluate(() => localStorage.getItem("wave-current-trip-v1"));
  await page.evaluate(() => {
    localStorage.removeItem("wave-planner-stage-view-v2");
    localStorage.setItem("wave-planner-stage-view-v1", "overview");
    sessionStorage.removeItem("wave-planner-active-step-v1");
  });
  await page.goto("/planner?question=0#conditions");
  await expect(page.locator(".simple-browse-view")).toBeVisible();
  await expect(page.locator(".journey-mode-toggle, .planner-navigation")).toHaveCount(0);
  await expect(page.locator('.simple-browse-view input[type="date"]')).toHaveCount(0);
  await expect(page.locator(".wave-trip-count")).toHaveText("1");
  await page.locator(".simple-planner-tabs").getByRole("button", { name: /^내 일정/ }).click();
  await expect(page.locator(".simple-initial-setup")).toContainText("경남도립미술관");
  expect(await page.evaluate(() => localStorage.getItem("wave-current-trip-v1"))).toBe(saved);
});

test("dates are chosen after collecting places and an unapplied date draft survives returning to browsing", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.goto("/planner?question=3#conditions");
  await expect(page.locator(".simple-region-entry h2")).toHaveText("경남, 모두의 여행지");
  await expect(page.locator("#planner .simple-region-link")).toHaveCount(6);
  const screens = page.getByRole("group", { name: "여행 설계 화면", exact: true });
  await expect(screens.getByRole("button", { name: /^내 일정/ })).toBeEnabled();
  await page.getByRole("button", { name: "창원 지역 선택", exact: true }).click();
  await page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true }).click();
  await screens.getByRole("button", { name: /^내 일정/ }).click();
  const setup = page.locator(".simple-initial-setup");
  await expect(setup.getByRole("heading", { name: "언제 떠날까요?", exact: true })).toBeVisible();
  await setup.getByLabel("시작일", { exact: true }).fill("2026-09-20");
  await setup.getByLabel("마지막 날", { exact: true }).fill("2026-09-21");
  await screens.getByRole("button", { name: "여행지 찾기", exact: true }).click();
  await expect(page.locator(".simple-results")).toBeVisible();
  const schedule = await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values?.["wave-trip-schedule-v1"] || "{}"));
  expect(schedule).toMatchObject({ travelStart: "", travelEnd: "", scheduleAssignments: {} });
  await screens.getByRole("button", { name: /^내 일정/ }).click();
  await expect(setup.getByLabel("시작일", { exact: true })).toHaveValue("2026-09-20");
  await expect(setup.getByLabel("마지막 날", { exact: true })).toHaveValue("2026-09-21");
  await expect(page.locator(".journey-mode-toggle, .reference-journey-views")).toHaveCount(0);
});

test("landing: region browsing follows ordinary scrolling and keeps focused choices when motion is reduced", async ({ page }) => {
  await prepareStory(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/"); await storyReady(page);
  const region = page.locator("#regions"), cards = region.locator(".simple-region");
  await expect(cards.locator("h3")).toHaveText(firstRegions);
  const expand = region.getByRole("button", { name: "18개 지역 모두 보기", exact: true });
  // The region control is disabled until its own hydration completes.
  await expect(expand).toBeEnabled();
  await expand.focus();
  await expect(expand).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(cards).toHaveCount(18);
  await expect(region.getByRole("button", { name: "접기", exact: true })).toBeFocused();
  const last = cards.last().locator(".simple-region-link");
  await last.focus();
  const destination = await last.getAttribute("href");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("href", destination!);
  const before = await region.evaluate(node => ({ top: node.getBoundingClientRect().top, scroll: scrollY }));
  await page.evaluate(() => scrollBy({ top: -90, behavior: "instant" }));
  const after = await region.evaluate(node => ({ top: node.getBoundingClientRect().top, scroll: scrollY }));
  expect(Math.abs(after.top - before.top + after.scroll - before.scroll)).toBeLessThanOrEqual(1);
  expect(await region.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  await expectNoOverflow(page);
});

test("landing: reading a region never rotates its photo, changes its destination or recentres the page", async ({ page }) => {
  await prepareStory(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.goto("/"); await storyReady(page);
  const cards = page.locator(".simple-region"), focused = cards.nth(4).locator(".simple-region-link");
  // Establish a reading position without sampling native smooth-focus scrolling
  // halfway through its movement. The subsequent <=1px hold stays strict.
  await focused.evaluate(node => {
    node.scrollIntoView({ block: "center", behavior: "instant" });
    (node as HTMLElement).focus({ preventScroll: true });
  });
  await expect.poll(() => page.locator("#regions").evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  const original = await cards.evaluateAll(nodes => nodes.map(node => ({
    name: node.querySelector("h3")?.textContent, href: node.querySelector("a")?.getAttribute("href"), image: node.querySelector("img")?.getAttribute("src"),
  })));
  const scroll = await page.evaluate(() => scrollY);
  await page.clock.fastForward(60_000);
  await expect(focused).toBeFocused();
  expect(Math.abs(await page.evaluate(() => scrollY) - scroll)).toBeLessThanOrEqual(1);
  expect(await cards.evaluateAll(nodes => nodes.map(node => ({
    name: node.querySelector("h3")?.textContent, href: node.querySelector("a")?.getAttribute("href"), image: node.querySelector("img")?.getAttribute("src"),
  })))).toEqual(original);
  await expectNoOverflow(page);
});
