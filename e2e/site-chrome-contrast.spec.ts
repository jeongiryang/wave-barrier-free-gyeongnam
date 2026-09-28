import { openSupportMenu } from "./support-menu";
import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { findLowContrastText, formatFindings } from "./contrast";
import { mockPlannerApi } from "./fixtures";
import { prepareLandingMedia, storyReady } from "./landing-contract";
import { paintedContrast } from "./painted-contrast";

/**
 * 화면 어디에나 있는 공통 요소(환경설정 토글, 지역 칩)와 주요 공개 화면의 글자가
 * 두 테마 모두에서 읽혀야 한다.
 */
const PAGES = ["/", "/planner", "/community", "/community/new", "/photo-course", "/travel-book"];

async function closingTextContrast(page: Page) {
  await storyReady(page);
  const closing = page.locator("#closing");
  await closing.scrollIntoViewIfNeeded();
  await expect(closing).toBeVisible();
  await expect.poll(() => closing.locator('.landing-closing-copy').evaluate(node => node.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
  await expect(page.locator(".landing-finale img,.landing-finale .award-panorama")).toHaveCount(0);
  await expect(closing.locator("img,figcaption,a,button")).toHaveCount(0);
  const samples = await closing.evaluate(root => {
    const frame = root.getBoundingClientRect();
    return [...root.querySelectorAll("h2,.landing-closing-copy > p")].map(node => {
      const foreground = getComputedStyle(node), box = node.getBoundingClientRect();
      return { text: node.textContent, color: foreground.color, opacity: foreground.opacity,
        // Independently rounded DOMRects can differ by a fraction of a pixel at
        // the shared bottom edge, particularly at non-integer device scales.
        covered: box.left >= frame.left - 1 && box.right <= frame.right + 1 && box.top >= frame.top - 1 && box.bottom <= frame.bottom + 1 };
    });
  });
  expect(samples).toHaveLength(2);
  for (const sample of samples) {
    expect(sample.opacity).toBe("1");
    expect(sample.covered).toBe(true);
  }
  // The approved closing uses a gradient title. Measure its painted glyphs and
  // backdrop rather than treating its transparent text-fill as a solid colour.
  const contrast = [];
  for (const selector of ["#closing h2", "#closing .landing-closing-copy > p"]) {
    await expect(page.locator(selector)).toHaveCount(1);
    const sample = await paintedContrast(page, selector);
    expect(sample.pixels, selector).toBeGreaterThan(0);
    expect(sample.minimum, `${selector}: text-only closing contrast`).toBeGreaterThanOrEqual(4.5);
    contrast.push({ selector, ...sample });
  }
  await closing.screenshot({ path: test.info().outputPath("closing-text.png") });
  const evidencePath = test.info().outputPath("closing-text-contrast.json");
  await writeFile(evidencePath, JSON.stringify({ samples, contrast }, null, 2));
  await test.info().attach("closing-text-contrast", { path: evidencePath, contentType: "application/json" });
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 화면에서 읽기 어려운 글자가 없다`, async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await prepareLandingMedia(page);
    await mockPlannerApi(page);
    await page.addInitScript((value) => {
      window.sessionStorage.setItem("wave-arrival-session-v1", "done");
      window.localStorage.setItem("wave-theme", value as string);
    }, theme);

    const failures: string[] = [];
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2_000);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
      if (path === "/") await closingTextContrast(page);
      const findings = await findLowContrastText(page);
      if (findings.length) failures.push(formatFindings(path, findings));
      if (path === "/") {
        const photoUrl = "https://tong.visitkorea.or.kr/**";
        await page.route(photoUrl, route => route.abort());
        await page.reload({ waitUntil: "domcontentloaded" });
        await closingTextContrast(page);
        const fallbackFindings = await findLowContrastText(page);
        if (fallbackFindings.length) failures.push(formatFindings("/ (hero photo failed)", fallbackFindings));
        await page.unroute(photoUrl);
      }
    }

    expect(failures, `대비 4.5 미만\n${failures.join("\n")}`).toEqual([]);
  });
}

test("OS 동작 감소에서도 환경설정의 모든 항목은 읽힌다", async ({ page }) => {
  // Keep the contrast regression over every remaining preference after retiring the manual motion control.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepareLandingMedia(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("wave-arrival-session-v1", "done");
    window.localStorage.setItem("wave-theme", "dark");
  });
  await page.goto("/community", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);

  await openSupportMenu(page);
  await page.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ }).first().click();
  await page.waitForTimeout(400);
  await expect(page.locator("button.motion-toggle")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "full");

  const findings = await findLowContrastText(page);
  expect(findings, `환경설정과 배경 대비\n${formatFindings("/community", findings)}`).toEqual([]);
});
