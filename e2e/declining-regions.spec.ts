import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { prepareStory, storyReady } from "./landing-contract";

const officialRegions = ["거창", "고성", "남해", "밀양", "산청", "의령", "창녕", "하동", "함안", "함양", "합천"];
const notice = "행정안전부 인구감소지역이에요.";
const source = "행정안전부 고시 · 확인 2026-09-20";

test("landing omits declining-region controls and notices", async ({ page }) => {
  await prepareStory(page);
  await page.goto("/");
  await storyReady(page);
  const section = page.locator("#regions");
  await section.getByRole("button", { name: "18개 지역 모두 보기", exact: true }).click();
  await expect(section.getByText(notice, { exact: true })).toHaveCount(0);
  await expect(section.getByText(source, { exact: true })).toHaveCount(0);
  await expect(page.locator("#story").getByRole("button", { name: "인구감소지역 우선 보기", exact: true })).toHaveCount(0);
  await expect(page.locator("#story .region-picker-source")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include("#regions").analyze()).violations).toEqual([]);
  for (const width of [390, 960, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(section.locator(".simple-region-link").first()).toBeVisible();
  }
});

test("planner filter reorders all regions without hiding or requesting data and resets on reload", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.goto("/planner?question=3#conditions");
  const discovery = page.locator(".simple-region-discovery");
  await expect(discovery.locator(".simple-region")).toHaveCount(6);
  await discovery.getByRole("button", { name: "전체 18개 지역", exact: true }).click();
  await expect(discovery.locator(".simple-region")).toHaveCount(18);
  const apiRequests: string[] = [];
  page.on("request", request => { if (/\/api\//.test(request.url())) apiRequests.push(request.url()); });
  const filter = discovery.getByRole("button", { name: "인구감소지역 우선 보기", exact: true });
  await filter.click();
  await expect(discovery.getByRole("button", { name: "인구감소지역 먼저 보는 중", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(discovery.locator(".simple-region")).toHaveCount(18);
  const orderedNames = await discovery.locator(".simple-region h3").allTextContents();
  expect(orderedNames.slice(0, 11).toSorted()).toEqual(officialRegions.toSorted());
  expect(orderedNames.slice(11).some(name => officialRegions.includes(name))).toBe(false);
  expect(apiRequests).toEqual([]);
  expect((await new AxeBuilder({ page }).include(".simple-region-entry").analyze()).violations).toEqual([]);

  await page.reload();
  await expect(page.locator(".simple-region-discovery").getByRole("button", { name: "인구감소지역 우선 보기", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".simple-region-discovery .simple-region")).toHaveCount(6);
});
