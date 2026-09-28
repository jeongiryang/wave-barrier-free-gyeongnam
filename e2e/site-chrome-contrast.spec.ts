import { openSupportMenu } from "./support-menu";
import { expect, test, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { findLowContrastText, formatFindings } from "./contrast";
import { mockPlannerApi } from "./fixtures";
import { prepareLandingMedia, storyReady } from "./landing-contract";
import { paintedContrast, waitForRenderedEntry } from "./painted-contrast";

/**
 * 화면 어디에나 있는 공통 요소(환경설정 토글, 지역 칩)와 주요 공개 화면의 글자가
 * 두 테마 모두에서 읽혀야 한다.
 */
const PAGES = ["/", "/planner", "/community", "/community/new", "/photo-course", "/travel-book"];

async function checkRegionalSvgContrast(page: Page) {
  // SVG labels paint with fill over their local stroke. HTML color/background
  // sampling compares two unrelated colours here, so audit the real SVG paint.
  const labels = page.locator('.night-journey-map svg [data-region-photo] > text');
  await expect(labels).toHaveCount(18);
  // A new SVG must receive its own audit rather than sharing this exemption.
  await expect(page.locator('svg > g > text')).toHaveCount(18);
  await waitForRenderedEntry(page.locator('.night-journey-map'));
  const evidence = await labels.evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node);
    const rgb = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
    const luma = (values: number[]) => values.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    const fill = rgb(style.fill), stroke = rgb(style.stroke);
    const a = luma(fill), b = luma(stroke);
    let opacity = 1;
    for (let ancestor: Element | null = node; ancestor; ancestor = ancestor.parentElement) opacity *= Number(getComputedStyle(ancestor).opacity);
    return { text: node.textContent || '', fill, stroke, opacity, fillOpacity: style.fillOpacity, strokeOpacity: style.strokeOpacity, strokeWidth: parseFloat(style.strokeWidth), paintOrder: style.paintOrder, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
  }));
  for (const item of evidence) {
    expect(item.fill.length, item.text).toBeGreaterThanOrEqual(3);
    expect(item.stroke.length, item.text).toBeGreaterThanOrEqual(3);
    expect(item.fill[3] ?? 1).toBe(1); expect(item.stroke[3] ?? 1).toBe(1);
    expect(item.opacity).toBe(1); expect(item.fillOpacity).toBe('1'); expect(item.strokeOpacity).toBe('1');
    expect(item.strokeWidth).toBeGreaterThanOrEqual(1);
    expect(item.paintOrder.split(' ')[0]).toBe('stroke');
    expect(item.ratio, `${item.text}: SVG fill/stroke contrast`).toBeGreaterThanOrEqual(4.5);
  }
  await test.info().attach('regional-svg-contrast', { body: JSON.stringify(evidence), contentType: 'application/json' });
  return new Set(evidence.map(item => item.text));
}

async function pageTextFindings(page: Page, path: string) {
  const checkedLabels = path === '/' ? await checkRegionalSvgContrast(page) : new Set<string>();
  const findings = await findLowContrastText(page);
  // Only these independently checked SVG labels leave the HTML-only report.
  return findings.filter(item => item.where !== 'svg > g > text' || !checkedLabels.has(item.text));
}

test('regional SVG contrast still rejects matching fill and stroke colours', async ({ page }) => {
  await page.setContent(`<div class="night-journey-map"><svg width="500" height="500">${Array.from({ length: 18 }, (_, index) => `<g data-region-photo="${index}"><text x="10" y="${20 + index * 24}" style="fill:white;stroke:white;stroke-width:2px;paint-order:stroke">지역 ${index}</text></g>`).join('')}</svg></div>`);
  await expect(checkRegionalSvgContrast(page)).rejects.toThrow(/SVG fill\/stroke contrast/);
  await page.locator('text').evaluateAll(nodes => nodes.forEach(node => (node as SVGElement).style.stroke = 'black'));
  expect((await checkRegionalSvgContrast(page)).size).toBe(18);
});

async function closingTextContrast(page: Page) {
  await storyReady(page);
  const closing = page.locator("#closing");
  await closing.scrollIntoViewIfNeeded();
  await expect(closing).toBeVisible();
  await waitForRenderedEntry(closing.locator('.landing-closing-copy'));
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
    await page.route('**/api/judge-demo-photos', route => route.fulfill({ json: { photos: [
      { fileName: 'sample-coast.jpg', caption: '첫째 날 오전, 바닷길 예시' },
      { fileName: 'sample-garden.jpg', caption: '첫째 날 오후, 정원 예시' },
      { fileName: 'sample-riverside.jpg', caption: '둘째 날 오전, 강변 예시' },
    ] } }));
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
      if (path === '/photo-course') {
        const sampleButton = page.getByRole('button', { name: '시연 사진 3장으로 시작', exact: true });
        await expect(sampleButton).toBeEnabled();
        await sampleButton.screenshot({ path: test.info().outputPath(`photo-course-button-${theme}.png`) });
        await test.info().attach('enabled-photo-course-colours', { body: JSON.stringify(await sampleButton.evaluate(node => {
          const style = getComputedStyle(node);
          return { color: style.color, background: style.backgroundColor, opacity: style.opacity, disabled: (node as HTMLButtonElement).disabled };
        })), contentType: 'application/json' });
      }
      const findings = await pageTextFindings(page, path);
      if (findings.length) failures.push(formatFindings(path, findings));
      if (path === "/") {
        const photoUrl = "https://tong.visitkorea.or.kr/**";
        await page.route(photoUrl, route => route.abort());
        await page.reload({ waitUntil: "domcontentloaded" });
        await closingTextContrast(page);
        const fallbackFindings = await pageTextFindings(page, path);
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
