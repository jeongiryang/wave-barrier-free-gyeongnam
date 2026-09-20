import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { storyReady } from "./landing-contract";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await storyReady(page);
  await expect(page.locator("#regions .simple-show-regions")).toBeEnabled();
  await page.locator("#regions").scrollIntoViewIfNeeded();
});

test("확인된 지역에만 공식 문화 이야기와 출처를 표시한다", async ({ page }) => {
  const regions = page.locator("#regions");
  await expect(regions.locator(".simple-region-culture")).toHaveCount(1);
  await expect(regions.locator(".simple-region-culture").first()).toContainText("통영오광대");
  await expect(regions.locator(".simple-region-culture").first()).toContainText("국가유산청 국가유산포털 · 2026-09-20");
  await expect(regions.getByRole("article").filter({ hasText: "거제" }).locator(".simple-region-culture")).toHaveCount(0);

  await regions.getByRole("button", { name: /18개 지역 모두 보기/ }).click();
  await expect(regions.locator(".simple-region-culture")).toHaveCount(6);
  await expect(regions.getByRole("article").filter({ hasText: "밀양" }).locator(".simple-region-culture")).toContainText("밀양아리랑");
});

test("공식 안내 링크는 새 탭 보안 속성을 갖고 재생 기능이 없다", async ({ page }) => {
  const culture = page.locator("#regions .simple-region-culture").first();
  const disclosure = culture.locator("details");
  await expect(disclosure).not.toHaveAttribute("open", "");
  await disclosure.locator("summary").click();
  await expect(disclosure).toHaveAttribute("open", "");
  const link = culture.getByRole("link", { name: /자세히 보기, 새 탭/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(link).toHaveAttribute("href", /^https:\/\/(www\.)?heritage\.go\.kr\//);
  await expect(page.locator("#regions audio, #regions button", { hasText: /재생|듣기|정지/ })).toHaveCount(0);
  const box = await link.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
});

test("지역 문화 항목은 서버 API를 호출하거나 지역 선택 링크를 바꾸지 않는다", async ({ page }) => {
  await page.waitForLoadState("networkidle");
  const requests: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) requests.push(request.url()); });
  const regions = page.locator("#regions");
  await regions.getByRole("button", { name: /18개 지역 모두 보기/ }).click();
  await expect(regions.getByRole("link", { name: "밀양 여행지 보기" })).toHaveAttribute("href", "/planner?region=%EB%B0%80%EC%96%91");
  await page.waitForTimeout(100);
  expect(requests).toEqual([]);
});

test("지역 문화 카드에 axe 위반이 없다", async ({ page }) => {
  const results = await new AxeBuilder({ page }).include("#regions").analyze();
  expect(results.violations).toEqual([]);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 960, height: 900 }, { width: 1440, height: 900 }]) {
  test(`${viewport.width}px에서 카드 높이와 가로 배치가 유지된다`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.reload();
    await storyReady(page);
    const regions = page.locator("#regions");
    await expect(regions.locator(".simple-show-regions")).toBeEnabled();
    await regions.scrollIntoViewIfNeeded();
    const cards = await regions.locator(".simple-region-link").evaluateAll(nodes => nodes.map(node => ({ height: node.getBoundingClientRect().height, width: node.getBoundingClientRect().width })));
    expect(new Set(cards.map(card => Math.round(card.height))).size).toBe(1);
    expect(cards.every(card => card.width >= 0)).toBe(true);
    expect(await regions.evaluate(node => node.scrollWidth > node.clientWidth + 1)).toBe(false);
  });
}
