import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { chapterIds, openLandingTools, prepareStory, storyReady, expectUsableTarget,  expectNoOverflow } from "./landing-contract";
import { awardHeroImage, mockAwardHero } from './landing-photo-fixture';


test.beforeEach(async ({ page }) => { await prepareStory(page); await mockAwardHero(page); });

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: the service explains unknown facilities and connects its real planning and Naru actions`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/"); await storyReady(page);
    await expect(page.locator(".landing-page")).toHaveAttribute("lang", locale);
    // The chapter's effect-driven lazy map proves its client UI has committed;
    // the shell hydration timestamp only records hydrateRoot being scheduled.
    await page.locator("#story").scrollIntoViewIfNeeded();
    await expect(page.locator("#story").getByRole("group", { name: locale === "en" ? "Choose a region" : "여행 지역 선택", exact: true })).toBeVisible();
    const facilityTab = page.locator(".night-journey-tabs button").nth(1);
    await facilityTab.click();
    await expect(facilityTab).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".night-journey-step")).toContainText(locale === "en" ? "details that need checking" : "아직 확인이 필요한 항목");
    await openLandingTools(page);
    await expect(page.locator("#naru")).toContainText(locale === "en" ? "AI travel guide" : "경남 여행을 함께 찾고 일정을 정리해요");
    await expect(page.locator(".night-journey-tabs button")).toHaveCount(3);
    await expect(page.locator("#story")).not.toContainText("WAVE TRAVEL PLANNER");
    await expect(page.locator("#story")).not.toContainText("YOUR TRAVEL, CONNECTED");
    await expect(page.locator("#story").getByRole("button", { name: "이 지역들 먼저 보기", exact: true })).toHaveCount(0);
    const example = page.locator('.simple-naru-example');
    await expect(example).toHaveAttribute('aria-label', locale === 'en' ? 'Example conversation' : '대화 예시');
    await expect(example.locator('.example-user')).toHaveText(locale === 'en' ? 'Make my first visit 90 minutes.' : '첫 번째 장소에서 90분 머물게 해줘');
    await expect(example.getByRole('button', { name: locale === 'en' ? 'Apply to example' : '예시 일정에 적용', exact: true })).toBeEnabled();
    const photo = page.locator(".scenic-background-home .award-panorama");
    await expect(photo).toBeVisible();
    await expect.poll(() => photo.locator('img').evaluateAll(images => images.length > 0 && images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await expect(photo.locator("img")).toHaveAttribute("alt", "");
    await expect(page.locator("#regions .simple-region-arrow")).toHaveCount(0);
    const heroAction = page.locator('.night-hero-search button[type="submit"]');
    await expect(page.locator('.night-hero-search')).toHaveAttribute('action', '/planner');
    await expect(heroAction).toHaveAccessibleName(locale === 'en' ? 'Find places' : '여행지 검색');
    expect(await heroAction.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    for (const selector of ['.night-hero-search button[type="submit"]', "#story .night-journey-input > .night-primary", "#naru .simple-text-link[href*=assistant]"]) await expectUsableTarget(page.locator(selector));
    await expectNoOverflow(page);
    expect((await new AxeBuilder({ page }).include("#story").include("#naru").analyze()).violations).toEqual([]);
    const action = locale === 'en' ? page.locator('#naru .simple-text-link[href*=assistant]') : heroAction;
    if (locale === 'en') await expect(action).toHaveAttribute('href', '/planner?assistant=naru');
    else await expect(action).toHaveAttribute('type', 'submit');
    await action.press("Enter");
    await expect(page).toHaveURL(url => url.pathname === "/planner");
    if (locale === "en") await expect(page.getByRole("dialog", { name: "WAVE 여행 가이드 나루와 대화", exact: true })).toBeVisible();
  });

  test(`${locale}: failed decorative hero preserves all sections and keyboard planning`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await mockAwardHero(page, true);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const imageFailure = page.waitForEvent('requestfailed', request => request.url() === awardHeroImage);
    await page.goto("/"); await storyReady(page);
    await imageFailure;
    const photo = page.locator(".scenic-background-home .award-panorama");
    await expect(photo).toBeVisible();
    await expect(photo.locator("img")).toHaveCount(0);
    await expect(photo.locator('.award-panorama-credit')).toHaveCount(0);
    await expect(page.getByRole("heading",{level:1})).toBeVisible();
    await expect(page.locator("#regions .simple-region-arrow")).toHaveCount(0);
    expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      await expectUsableTarget(page.locator('.night-hero-search button[type="submit"]'));
      await expectNoOverflow(page);
    }
    expect((await new AxeBuilder({ page }).include("#top").analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}

for (const connectionMode of ["available", "unsupported"] as const) {
  test(`${connectionMode} data-saving API retains an accessible title and focus without requesting video`, async ({ page }) => {
    await page.addInitScript(mode => Object.defineProperty(navigator, "connection", {
      configurable: true, value: mode === "available" ? Object.assign(new EventTarget(), { saveData: false }) : undefined,
    }), connectionMode);
    const videos: string[] = [];
    page.on("request", request => { if (/\.mp4(?:\?|$)/.test(request.url())) videos.push(request.url()); });
    await page.clock.install();
    await page.goto("/"); await storyReady(page);
    const title = page.getByRole("heading", { level: 1 }), action = page.locator('.night-hero-search button[type="submit"]');
    await action.focus();
    if (connectionMode === "available") await page.evaluate(() => {
      const connection = (navigator as Navigator & { connection?: EventTarget & { saveData: boolean } }).connection;
      if (!connection) throw new Error("Expected the configured connection API");
      connection.saveData = true; connection.dispatchEvent(new Event("change"));
    });
    await page.clock.fastForward(60_000);
    await expect(title).toHaveAccessibleName("더 넓은 세상을 함께, WAVE");
    await expect(title).toHaveText(/^(더 넓은 세상을함께, WAVE|나만의 속도로편안한 여행을|새로운 경남을나루와 함께|함께 떠날수록더 가까운 여행)$/);
    await expect(action).toBeFocused();
    await expect(page.locator(".landing-hero video")).toHaveCount(0);
    expect(videos).toEqual([]);
  });
}
