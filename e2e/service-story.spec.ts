import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { prepareStory, storyReady, expectUsableTarget, chapterIds, expectNoOverflow } from "./landing-contract";
import { horizonPhotos } from "../features/landing/horizon-photos";

test.beforeEach(async ({ page }) => { await prepareStory(page); });

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: the service explains unknown facilities and connects its real planning and Naru actions`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/"); await storyReady(page);
    await expect(page.locator(".landing-page")).toHaveAttribute("lang", locale);
    await expect(page.locator(".simple-feature-list")).toContainText(locale === "en" ? "missing information" : "확인되지 않은 정보");
    await expect(page.locator("#naru")).toContainText(locale === "en" ? "AI travel guide" : "AI 여행 가이드");
    await expect(page.locator(".simple-product-preview")).toContainText(locale === "en" ? "Example" : "화면 예시");
    await expect(page.locator(".simple-naru-example")).toContainText(locale === "en" ? "Example" : "대화 예시");
    const photo = page.locator(".landing-hero-landscape");
    await expect(photo.locator("img")).toHaveAttribute("lang", "ko");
    await expect(photo.locator("figcaption")).toHaveAttribute("lang", "ko");
    await expect(photo.locator("img")).toHaveAttribute("alt", horizonPhotos.coast.title);
    await expect(photo.getByRole("link", { name: /사진 원본/ })).toHaveAttribute("href", horizonPhotos.coast.sourceUrl);
    for (const selector of [".landing-actions a", "#story .simple-text-link", "#naru .simple-text-link"]) await expectUsableTarget(page.locator(selector));
    await expectNoOverflow(page);
    expect((await new AxeBuilder({ page }).include("#story").include("#naru").analyze()).violations).toEqual([]);
    const action = page.locator(locale === "en" ? "#naru .simple-text-link" : ".landing-actions a");
    const expected = locale === "en" ? "/planner?assistant=naru" : "/planner";
    await expect(action).toHaveAttribute("href", expected);
    await action.press("Enter");
    await expect(page).toHaveURL(new URL(expected, test.info().project.use.baseURL as string).href);
  });

  test(`${locale}: failed hero artwork preserves its original author, licence, all sections and keyboard planning`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.route("**/media/horizon/hero-coast.jpg", route => route.abort());
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/"); await storyReady(page);
    const photo = page.locator(".landing-hero-landscape");
    await expect(photo.locator("img")).toHaveCount(0);
    await expect(photo.locator("figcaption")).toContainText("사진을 불러오지 못했어요");
    await expect(photo).toContainText(horizonPhotos.coast.photographer);
    await expect(photo).toContainText(horizonPhotos.coast.license);
    await expect(photo.getByRole("link", { name: /사진 원본/ })).toHaveAttribute("href", horizonPhotos.coast.sourceUrl);
    expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await expectUsableTarget(page.locator(".landing-actions a"));
      await expectNoOverflow(page);
    }
    expect((await new AxeBuilder({ page }).include("#top").analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}

for (const connectionMode of ["available", "unsupported"] as const) {
  test(`${connectionMode} data-saving API retains static copy and focus without requesting video`, async ({ page }) => {
    await page.addInitScript(mode => Object.defineProperty(navigator, "connection", {
      configurable: true, value: mode === "available" ? Object.assign(new EventTarget(), { saveData: false }) : undefined,
    }), connectionMode);
    const videos: string[] = [];
    page.on("request", request => { if (/\.mp4(?:\?|$)/.test(request.url())) videos.push(request.url()); });
    await page.clock.install();
    await page.goto("/"); await storyReady(page);
    const copy = await page.getByRole("heading", { level: 1 }).innerText(), action = page.locator(".landing-actions a");
    await action.focus();
    if (connectionMode === "available") await page.evaluate(() => {
      const connection = (navigator as Navigator & { connection?: EventTarget & { saveData: boolean } }).connection;
      if (!connection) throw new Error("Expected the configured connection API");
      connection.saveData = true; connection.dispatchEvent(new Event("change"));
    });
    await page.clock.fastForward(60_000);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy, { useInnerText: true });
    await expect(action).toBeFocused();
    await expect(page.locator(".landing-hero video")).toHaveCount(0);
    expect(videos).toEqual([]);
  });
}
