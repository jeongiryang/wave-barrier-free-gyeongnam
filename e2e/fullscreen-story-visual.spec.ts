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
  for (const [index, selector] of [".region-story", ".manifesto", ".story-expansion", ".destination-editorial", ".itinerary-chapter", ".map-chapter", ".departure-scene", ".community-chapter", ".landing-cta"].entries()) {
    const section = page.locator(selector);
    await section.evaluate(node => node.scrollIntoView({ behavior: "instant", block: "center" }));
    await expect.poll(() => section.locator("h2").first().evaluate(node => {
      const reveal = node.closest("[data-land-reveal]") || node;
      return Number(getComputedStyle(reveal).opacity);
    })).toBe(1);
    await page.screenshot({ path: test.info().outputPath(`${index + 3}-scene.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  // All dated states stay visible without explaining/selection buttons.
  for (const kind of ["itinerary", "map"]) {
    const section = page.locator(`.${kind}-chapter`);
    await expect(section.getByRole("button")).toHaveCount(0);
    const scenes = section.locator(".journey-dated-scene");
    await expect(scenes).toHaveCount(3);
    for (let day = 0; day < 3; day++) {
      const scene = scenes.nth(day);
      await scene.scrollIntoViewIfNeeded();
      await expect(scene).toBeVisible();
      await expect(scene).toHaveAttribute("data-date", day === 2 ? "2026-09-10" : "2026-09-09");
      expect(await scene.locator("[data-place-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-place-id")))).toEqual(day === 0 ? ["126117", "2758443"] : day === 1 ? ["126117"] : ["2758443"]);
      const img = scene.locator("img");
      await expect.poll(() => img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    }
  }
  // One complete static page documents the whole composition, separately from normal-motion scenes.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".story-expansion")).toHaveCSS("--cinema-progress", "1");
  await page.screenshot({ fullPage: true, scale: "css", path: test.info().outputPath("whole-page-static.png") });
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
