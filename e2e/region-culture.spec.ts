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

test("지역 사진 카드는 별도 문화·출처 패널 없이 사진으로 채운다", async ({ page }) => {
  const regions = page.locator("#regions");
  await expect(regions.locator(".simple-region-culture,.declining-region-notice,.simple-region-arrow")).toHaveCount(0);
  await regions.getByRole("button", { name: /18개 지역 모두 보기/ }).click();
  await expect(regions.locator(".simple-region-culture,.declining-region-notice,.simple-region-arrow")).toHaveCount(0);
  await expect(regions.locator(".simple-region-credit")).toHaveCount(18);
  const fill = await regions.locator(".simple-region").first().evaluate(node => {
    const card = node.getBoundingClientRect(), link = node.querySelector(".simple-region-link")!.getBoundingClientRect(), image = node.querySelector("img")!.getBoundingClientRect();
    return [Math.abs(card.height-link.height), Math.abs(link.height-image.height), Math.abs(link.width-image.width)];
  });
  expect(fill.every(gap => gap <= 2)).toBe(true);
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
