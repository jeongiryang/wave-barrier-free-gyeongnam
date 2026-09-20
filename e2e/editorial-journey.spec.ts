import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { storyReady, chapterIds } from "./landing-contract";

for (const theme of ["light", "dark"]) for (const size of [0, 1]) test(`editorial introduction and working pages remain readable in ${theme}, size ${size}`, async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { plannerView: "guided" });
  await page.addInitScript(theme => {
    sessionStorage.setItem("wave-arrival-session-v1", "done");
    localStorage.setItem("wave-theme", theme);
  }, theme);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const bitmap = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType: "image/webp", body: bitmap }));
  await page.route("**/api/community/posts?**", route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
  const widths = test.info().project.name.includes("mobile") ? [280, 390] : [960, 1440];
  {
    const width = widths[size];
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await storyReady(page);
    for (const id of chapterIds) {
      const scene = page.locator(`#${id}`);
      await scene.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
      await expect(scene).toBeVisible();
      expect((await new AxeBuilder({ page }).include(`#${id}`).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await scene.screenshot({ path: test.info().outputPath(`${id}-${theme}-${width}.png`) });
    }
    await expect(page.locator(".horizon-chapter-copy")).toHaveCount(3);
    await expect(page.locator(".simple-naru-example")).toContainText("대화 예시");
    await page.goto("/planner");
    const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
    await expect(region).toBeEnabled();
    await expect(region).toHaveValue("");
    const regionCards = page.locator(".simple-region-entry .simple-region-link");
    await expect(regionCards).toHaveCount(6);
    await expect(page.locator('.simple-region-entry [aria-pressed="true"]')).toHaveCount(0);
    await page.getByRole("button", { name: "전체 18개 지역", exact: true }).click();
    await expect(regionCards).toHaveCount(18);
    expect((await new AxeBuilder({ page }).include("#planner").analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`region-${theme}-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "통영 지역 선택", exact: true }).click();
    await expect(region).toHaveValue("통영");
    await expect(page.locator(".simple-place-row")).toHaveCount(2);
    const activity = page.getByRole("group", { name: "하고 싶은 활동", exact: true }).getByRole("button").first();
    await activity.click();
    await expect(activity).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "필요한 편의", exact: true }).click();
    const picker = page.getByRole("dialog", { name: "필요한 편의", exact: true });
    await expect(picker.getByRole("heading", { name: "필요한 편의", exact: true })).toBeFocused();
    await picker.getByRole("checkbox", { name: "접근로", exact: true }).check();
    await expect(picker.getByRole("checkbox", { checked: true })).toHaveCount(1);
    // A checkbox is a reviewable draft; opening and editing this dialog must
    // not persist personal facility needs before the explicit apply action.
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"))).toEqual([]);
    expect((await new AxeBuilder({ page }).include(".simple-facility-picker").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`facilities-${theme}-${width}.png`), fullPage: true });
    await picker.getByRole("button", { name: "적용 · 1개", exact: true }).click();
    await expect(picker).toHaveCount(0);
    await expect(page.getByRole("button", { name: "필요한 편의 · 1개", exact: true })).toBeFocused();
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"))).toEqual(["route"]);
    await page.goto("/community");
    await expect(page.locator(".community-state")).toContainText("아직 등록된");
    if (width >= 390) {
      // The board's primary action must be reachable in the first viewport;
      // an inherited display headline previously pushed it below the fold.
      const write = await page.locator(".community-task-heading .community-write").boundingBox();
      expect(write!.y + write!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    }
    expect((await new AxeBuilder({ page }).include(".community-page").analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: test.info().outputPath(`board-${theme}-${width}.png`), fullPage: true });
  }
});

test("English travel pages identify original Korean photography and community copy", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    sessionStorage.setItem("wave-arrival-session-v1", "done");
    localStorage.setItem("wave-locale", "en");
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const bitmap = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType: "image/webp", body: bitmap }));
  await page.goto("/");
  await storyReady(page);
  await expect(page.locator(".landing-page")).toHaveAttribute("lang", "en");
  await expect(page.locator(".landing-hero-landscape img")).toHaveAttribute("lang", "ko");
  await expect(page.locator(".landing-hero-landscape figcaption")).toHaveAttribute("lang", "ko");
  await expect(page.locator(".landing-hero-landscape figcaption a").first()).toContainText("사진 원본");
  await expect(page.locator("#community h2")).toContainText("당신이 남긴 장면이");
  expect(await page.locator("#community h2").evaluate(node => node.closest("[lang]")?.getAttribute("lang"))).toBe("ko");
  await page.goto("/planner");
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toBeEnabled();
  const cards = page.locator(".simple-region-entry .simple-region");
  await expect(cards).toHaveCount(6);
  expect(await cards.locator("h3").allTextContents()).toEqual(["통영", "거제", "남해", "진주", "창원", "하동"]);
  // The photos are decorative beside visible place names; Korean names and
  // original photographer credits still need their own language boundary.
  expect(await cards.locator("img").evaluateAll(nodes => nodes.every(node => node.getAttribute("alt") === ""))).toBe(true);
  expect(await cards.locator(".simple-region-link, .simple-region-credit").evaluateAll(nodes => nodes.every(node => node.closest("[lang]")?.getAttribute("lang") === "ko"))).toBe(true);
  await expect(page.getByRole("button", { name: "All 18 regions", exact: true })).toBeVisible();
  await page.goto("/community");
  await expect(page.locator(".community-task-heading")).toHaveAttribute("lang", "ko");
  await expect(page.locator(".community-task-heading h1")).toHaveText("질문·후기");
});
