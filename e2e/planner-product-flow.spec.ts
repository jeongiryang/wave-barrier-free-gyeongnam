import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

test("390px·768px·1440px에서 네 단계 계획 흐름과 단일 일정이 유지된다", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "대표 Chromium 프로젝트에서 세 뷰포트를 직접 확인합니다.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().startsWith("Failed to load resource:")) consoleErrors.push(message.text());
  });

  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/planner");
    await expect(page.getByRole("heading", { name: "여행 조건 정하기" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "여행지 고르기" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "이 기기 일정 만들기" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "출발 전에 이것만 다시 확인하세요." })).toBeVisible();
    await expect(page.getByRole("region", { name: "날짜별 여행 일정" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "이 기기 일정", exact: true })).toHaveCount(1);

    await page.getByRole("navigation", { name: "여행 계획 단계 이동" }).getByRole("button", { name: /이 기기 일정/ }).click();
    await expect.poll(() => page.locator("#itinerary").evaluate((node) => node.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${width}px 화면의 가로 넘침`).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "경남도립미술관 일정에 추가" }).click();
    const itinerary = page.getByRole("region", { name: "날짜별 여행 일정" });
    await expect(itinerary).toHaveCount(1);
    await itinerary.scrollIntoViewIfNeeded();
    await expect(itinerary.getByText("경남도립미술관").first()).toBeVisible();
    const screenshotPath = testInfo.outputPath(`planner-${width}px.png`);
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach(`planner-${width}px`, { path: screenshotPath, contentType: "image/png" });
    await page.getByRole("button", { name: "경남도립미술관 일정에서 제거" }).click();
  }

  expect(consoleErrors).toEqual([]);
});

test("랜딩 딥링크와 플래너 헤더는 안내형 보기에서도 실제 일정·지도 단계를 연다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.goto("/");
  await expect(page.getByRole("link", { name: /일정 구성해 보기/ })).toHaveAttribute("href", "/planner#itinerary");

  await page.goto("/planner#navigation");
  await expect(page.locator(".journey-stage-stream")).toHaveAttribute("data-view", "guided");
  await expect(page.locator("#itinerary")).toBeVisible();
  await expect(page.locator("#navigation")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "여행 계획 단계 이동" }).getByRole("button", { name: /이 기기 일정/ })).toHaveAttribute("aria-current", "step");

  await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "여행 조건" }).click();
  await expect(page.locator("#conditions")).toBeVisible();
  await page.locator(".header-action").click();
  await expect(page.locator("#itinerary")).toBeVisible();
});
