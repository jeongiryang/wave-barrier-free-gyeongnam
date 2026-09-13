import { openSupportMenu } from "./support-menu";
import { expect, test, type Page } from "@playwright/test";
import { findLowContrastText, formatFindings } from "./contrast";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { storyReady } from "./landing-contract";

/**
 * 화면 어디에나 있는 공통 요소(환경설정 토글, 지역 칩)와 주요 공개 화면의 글자가
 * 두 테마 모두에서 읽혀야 한다.
 */
const PAGES = ["/", "/planner", "/community", "/community/new", "/photo-course", "/travel-book"];

async function closingPhotoContrast(page: Page, failed: boolean) {
  await storyReady(page);
  const closing = page.locator("#closing");
  await closing.scrollIntoViewIfNeeded();
  await expect(closing).toBeVisible();
  // Removing a gradient must not leave the inherited transparent text fill.
  await expect(closing.locator("h2 em")).toHaveCSS("-webkit-text-fill-color", "rgb(255, 255, 255)");
  if (failed) {
    await expect(closing.locator("img")).toHaveCount(0);
    await expect(closing.locator("figcaption")).toContainText("사진을 불러오지 못했어요");
  } else {
    await expect.poll(() => closing.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  }
  const result = await closing.evaluate(root => {
    const rgba = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => {
      const s = value / 255;
      return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
    }).reduce((sum, channel, i) => sum + channel * [.2126, .7152, .0722][i], 0);
    const style = getComputedStyle(root), scrim = getComputedStyle(root, "::before");
    const photo = root.querySelector(".closing-horizon")!;
    const frame = root.getBoundingClientRect(), picture = photo.getBoundingClientRect();
    const overlay = rgba(scrim.backgroundColor), alpha = (overlay[3] ?? 1) * Number(scrim.opacity);
    // White is the brightest possible photograph or failed-image backing pixel.
    // For white text this gives the lowest contrast across every possible image.
    const backing = overlay.slice(0, 3).map(channel => channel * alpha + 255 * (1 - alpha));
    const samples = [...root.querySelectorAll(":scope > .closing-eyebrow, :scope > p")].map(node => {
      const foreground = getComputedStyle(node), box = node.getBoundingClientRect();
      return {
        text: (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24),
        suffix: node.tagName === "P" ? " > p" : " > span.closing-eyebrow",
        color: foreground.color, opacity: foreground.opacity,
        covered: box.left >= frame.left && box.right <= frame.right && box.top >= frame.top && box.bottom <= frame.bottom,
        ratio: (luminance(rgba(foreground.color)) + .05) / (luminance(backing) + .05),
      };
    });
    return {
      isolation: style.isolation, opacity: style.opacity,
      scrim: { content: scrim.content, position: scrim.position, insets: [scrim.top, scrim.right, scrim.bottom, scrim.left], image: scrim.backgroundImage, color: scrim.backgroundColor, opacity: scrim.opacity },
      photoBehindScrim: Number(getComputedStyle(photo).zIndex) < Number(scrim.zIndex) && Number(scrim.zIndex) < 0,
      photoFillsFrame: [picture.left - frame.left, picture.top - frame.top, picture.right - frame.right, picture.bottom - frame.bottom].every(value => Math.abs(value) <= 1),
      backing, samples,
    };
  });
  expect(result.isolation).toBe("isolate");
  expect(result.opacity).toBe("1");
  expect(result.scrim.content).not.toBe("none");
  expect(result.scrim.position).toBe("absolute");
  expect(result.scrim.insets).toEqual(["0px", "0px", "0px", "0px"]);
  expect(result.scrim.image).toBe("none");
  expect(result.scrim.opacity).toBe("1");
  expect(result.photoBehindScrim).toBe(true);
  expect(result.photoFillsFrame).toBe(true);
  expect(result.samples).toHaveLength(2);
  for (const sample of result.samples) {
    expect(sample.color).toBe("rgb(255, 255, 255)");
    expect(sample.opacity).toBe("1");
    expect(sample.covered).toBe(true);
    expect(sample.ratio, `${sample.text}: brightest-photo contrast`).toBeGreaterThanOrEqual(4.5);
  }
  await test.info().attach(failed ? "closing-failed-photo-contrast" : "closing-photo-contrast", { body: Buffer.from(JSON.stringify(result)), contentType: "application/json" });
  await closing.screenshot({ path: test.info().outputPath(failed ? "closing-photo-failed.png" : "closing-photo-loaded.png") });
  return result.samples;
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 화면에서 읽기 어려운 글자가 없다`, async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPublicShellApi(page);
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
      const photoText = path === "/" ? await closingPhotoContrast(page, false) : [];
      // The general ancestry-only measurement cannot see a sibling photograph or
      // ::before. Exclude only the two texts already proven over that actual scrim.
      const findings = (await findLowContrastText(page)).filter(finding => !photoText.some(sample =>
        finding.where.includes("section.landing-cta") && finding.where.endsWith(sample.suffix) && finding.text === sample.text));
      if (findings.length) failures.push(formatFindings(path, findings));
      if (path === "/") {
        const photoUrl = "**/media/horizon/hero-coast.jpg";
        await page.route(photoUrl, route => route.abort());
        await page.reload({ waitUntil: "domcontentloaded" });
        const fallbackText = await closingPhotoContrast(page, true);
        const fallbackFindings = (await findLowContrastText(page)).filter(finding => !fallbackText.some(sample =>
          finding.where.includes("section.landing-cta") && finding.where.endsWith(sample.suffix) && finding.text === sample.text));
        if (fallbackFindings.length) failures.push(formatFindings("/ (photo failed)", fallbackFindings));
        await page.unroute(photoUrl);
      }
    }

    expect(failures, `대비 4.5 미만\n${failures.join("\n")}`).toEqual([]);
  });
}

test("OS 동작 감소에서도 환경설정의 모든 항목은 읽힌다", async ({ page }) => {
  // Keep the contrast regression over every remaining preference after retiring the manual motion control.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("wave-arrival-session-v1", "done");
    window.localStorage.setItem("wave-theme", "dark");
  });
  await page.goto("/community", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);

  await openSupportMenu(page);
  await page.locator("summary[aria-label='환경설정 열기']").first().click();
  await page.waitForTimeout(400);
  await expect(page.locator("button.motion-toggle")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");

  const findings = await findLowContrastText(page);
  expect(findings, `환경설정과 배경 대비\n${formatFindings("/community", findings)}`).toEqual([]);
});
