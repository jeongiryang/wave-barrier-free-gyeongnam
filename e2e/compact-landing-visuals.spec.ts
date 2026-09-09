import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

const stages = ["conditions", "evidence", "schedule", "route", "adapt", "save", "community"];
const meanings = ["지역과 필요한 편의", "확인·미확인·불일치", "날짜별", "모든 인접 이동 구간", "비가 예상되면", "이 기기에", "공식 정보와 구분"];

for (const theme of ["light", "dark"] as const) {
  test(`compact ${theme} stories retain meaningful visuals, responsive hierarchy and keyboard CTAs`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await mockPublicShellApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((value) => localStorage.setItem("wave-theme", value), theme);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    // React streaming can briefly retain a hidden server copy beside the live main.
    // Wait for the visible page and unique committed tree before inspecting it.
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    await expect(page.locator(".landing-page")).toHaveCount(1);
    // The head script sets the theme before the streamed React page mounts.
    // Assert the landing effects are installed before resizing/scanning its DOM.
    await expect(page.locator(".landing-page")).toHaveClass(/motion-ready/);
    await expect(page.locator("button[data-region-marker]")).toHaveCount(18);
    await expect(page.locator(".product-preview").first()).toBeHidden();
    await expect(page.locator(".community-live-preview")).toBeHidden();
    await page.locator("#journey-tools-details > summary").click();
    await expect(page.locator("#journey-tools-details")).toHaveAttribute("open", "");

    for (const width of [390, 768, 960, 1366, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => document.fonts.ready);
      const diagrams = page.locator(".compact-journey-visual");
      await expect(diagrams).toHaveCount(7);
      for (let index = 0; index < stages.length; index++) {
        const figure = page.locator(`[data-journey="${stages[index]}"]`);
        await figure.scrollIntoViewIfNeeded();
        await expect(figure.getByRole("img")).toHaveAccessibleName(new RegExp(meanings[index]));
        await expect(figure.locator("figcaption")).toContainText(meanings[index]);
        const bounds = await figure.boundingBox();
        expect(bounds!.width).toBeGreaterThan(150);
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        const drawing = await figure.locator("svg").boundingBox();
        expect(drawing!.height).toBeGreaterThanOrEqual(96);
        expect(drawing!.height).toBeLessThanOrEqual(132);
        expect(await figure.locator("svg").evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
      }
      const rows = await page.locator(".product-story").evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
      const expectedColumns = width <= 600 ? 1 : width <= 960 ? 2 : 3;
      expect(new Set(rows).size).toBe(6 / expectedColumns);
      const links = page.locator(".product-story-copy > a");
      await expect(links).toHaveCount(6);
      await links.first().focus();
      for (let index = 0; index < 6; index++) {
        await expect(links.nth(index)).toBeFocused();
        const bounds = await links.nth(index).boundingBox();
        expect(bounds!.height).toBeGreaterThanOrEqual(44);
        expect(await links.nth(index).evaluate((link) => {
          const box = link.getBoundingClientRect();
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
          return hit !== null && link.contains(hit);
        }), `focused CTA ${index + 1} is not obscured at ${width}px`).toBe(true);
        if (index < 5) await page.keyboard.press("Tab");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      await page.locator(".product-stories").screenshot({ path: test.info().outputPath(`compact-${width}-${theme}.png`) });
      await page.locator(".landing-community").scrollIntoViewIfNeeded();
      await page.locator(".landing-community").screenshot({ path: test.info().outputPath(`community-${width}-${theme}.png`) });
      expect((await new AxeBuilder({ page }).include(".product-stories").include(".landing-community").analyze()).violations).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

for (const locale of ["ko", "en"] as const) {
  test(`${locale}: planning tools disclose all six links with native keyboard focus`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await mockPublicShellApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((value) => localStorage.setItem("wave-locale", value), locale);
    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    await expect(page.locator(".landing-page")).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);

    const details = page.locator("#journey-tools-details");
    const summary = details.locator(":scope > summary");
    const links = details.locator(".product-story-copy > a");
    const hrefs = ["/planner#planner", "/planner#places", "/planner#itinerary", "/planner#navigation", "/planner#layers", "/travel-book"];
    await expect(summary).toHaveAccessibleName(locale === "en" ? "Explore the planning tools" : "여행 계획 도구 자세히 보기");
    await expect(details).not.toHaveAttribute("open");
    await expect(links).toHaveCount(6);
    await expect(details.getByRole("link")).toHaveCount(0);
    for (const link of await links.all()) await expect(link).toBeHidden();
    await summary.focus();
    await expect(summary).toBeFocused();
    const originalSummary = await summary.elementHandle();
    expect(originalSummary).not.toBeNull();
    const closed = await details.boundingBox();
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    // Closed descendants must be absent from the native tab sequence.
    await page.keyboard.press("Tab");
    expect(await details.evaluate((node) => node.contains(document.activeElement))).toBe(false);
    await page.keyboard.press("Shift+Tab");
    await expect(summary).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(summary).toBeFocused();
    expect(await summary.evaluate((node, original) => node === original, originalSummary!)).toBe(true);
    await expect(details.locator(":scope > p")).toHaveText(locale === "en"
      ? "Explore the features you need, from recommendation evidence to journeys and saving."
      : "추천 근거부터 이동·저장까지, 필요한 기능을 살펴보세요.");
    await expect(details.getByRole("link")).toHaveCount(6);
    await expect(details.locator(".product-story")).toHaveCount(6);
    expect((await details.boundingBox())!.height).toBeGreaterThan(closed!.height);

    for (let index = 0; index < hrefs.length; index++) {
      await page.keyboard.press("Tab");
      const link = links.nth(index);
      await expect(link).toBeFocused();
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", hrefs[index]);
      const bounds = await link.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(await link.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
      })).toBe(true);
    }
    const bodySizes = await details.locator(":scope > p, .product-story-copy > p:not(.section-kicker)")
      .evaluateAll((nodes) => nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize)));
    expect(bodySizes).toHaveLength(7);
    for (const size of bodySizes) expect(size).toBeGreaterThanOrEqual(16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    await summary.focus();
    await page.keyboard.press("Space");
    await expect(details).not.toHaveAttribute("open");
    await expect(summary).toBeFocused();
    expect(await summary.evaluate((node, original) => node === original, originalSummary!)).toBe(true);
    await expect(details.getByRole("link")).toHaveCount(0);
    for (const link of await links.all()) await expect(link).toBeHidden();
    expect(Math.abs((await details.boundingBox())!.height - closed!.height)).toBeLessThanOrEqual(1);
    for (const planning of [page.locator(".landing-actions > a"), page.locator('.landing-cta > a[href="/planner"]')]) {
      await expect(planning).toHaveAccessibleName(locale === "en" ? "Plan my trip" : "여행 계획 만들기");
      await expect(planning).toHaveAttribute("href", "/planner");
      await planning.focus();
      await expect(planning).toBeFocused();
      await expect(planning).toBeVisible();
    }
    await originalSummary!.dispose();
    expect(errors).toEqual([]);
  });
}
