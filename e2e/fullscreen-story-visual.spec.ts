import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test.use({ video: "on" });

test("the full-screen arrival leads through the complete Korean service story", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.route("**/api/region-photo**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "사진을 불러오지 못했어요." }) }));
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await expect(intro.getByRole("button")).toHaveCount(1);
  await expect(intro.locator("canvas")).toHaveAttribute("data-intro-phase", "wordmark");
  await page.screenshot({ path: test.info().outputPath("01-fullscreen-intro.png") });
  await intro.getByRole("button", { name: "소개로 건너뛰기" }).click();
  await expect(intro).toBeHidden();
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("02-hero.png") });
  for (const [index, selector] of [".story-expansion", ".manifesto", ".possibility-scene", ".journey-scene", ".departure-scene", ".region-story", ".landing-cta"].entries()) {
    const section = page.locator(selector);
    await section.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
    await expect.poll(() => section.locator("h2").first().evaluate(node => {
      const reveal = node.closest("[data-land-reveal]") || node;
      return Number(getComputedStyle(reveal).opacity);
    })).toBe(1);
    await page.screenshot({ path: test.info().outputPath(`${index + 3}-scene.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  const stage = page.locator(".journey-stage");
  const steps = stage.getByRole("group", { name: "여행 계획 소개 단계 선택" });
  for (const index of [0, 1, 2, 3]) {
    const control = steps.getByRole("button").nth(index);
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(control).toBeFocused();
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await stage.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "start" }));
    await expect(stage.locator("#journey-stage-panel")).toBeVisible();
    if (index === 1 || index === 2) {
      const days = stage.getByRole("group", { name: "같은 시연의 날짜별 기록 선택" });
      for (const day of [0, 1, 2]) {
        await days.getByRole("button").nth(day).click();
        await expect(stage.locator(".journey-scene-stops")).toHaveAttribute("data-date", day === 2 ? "2026-09-10" : "2026-09-09");
      }
    }
    await page.screenshot({ path: test.info().outputPath(`journey-${index}.png`) });
  }
  // One complete static page documents the whole composition, separately from normal-motion scenes.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".story-expansion")).toHaveCSS("--scene-open", "1.000");
  await page.screenshot({ fullPage: true, scale: "css", path: test.info().outputPath("whole-page-static.png") });
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
