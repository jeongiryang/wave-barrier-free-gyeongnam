import { expect, test, type Page } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

function luminance([red, green, blue]: number[]) {
  const channel = (value: number) => {
    const ratio = value / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrastRatio(foreground: number[], background: number[]) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

async function samples(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((nodes) => {
    const parse = (value: string) => (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    return nodes
      .filter((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      })
      .map((node) => {
        let background = getComputedStyle(node).backgroundColor;
        let walker: Element | null = node;
        while (walker && (background === "rgba(0, 0, 0, 0)" || background === "transparent")) {
          walker = walker.parentElement;
          background = walker ? getComputedStyle(walker).backgroundColor : "rgb(255, 255, 255)";
        }
        return {
          background: parse(background),
          color: parse(getComputedStyle(node).color),
          text: node.textContent?.replace(/\s+/g, " ").trim().slice(0, 80) || node.tagName.toLowerCase(),
        };
      });
  });
}

const CASES = [
  ".landing-scroll",
  ".preview-note",
  ".access-preview > footer",
  ".signal-node",
  ".condition-preview > footer small",
  ".condition-preview > footer i",
  ".plan-preview li:not(.transfer) > i",
  ".plan-preview li > span",
  ".route-preview > footer span.active small",
  ".route-preview > footer span.active strong",
  ".adapt-preview > header small",
  ".adapt-preview > header > b",
  ".map-pin.pin-end",
];

for (const theme of ["dark", "light"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 랜딩의 미리보기 글자가 표면에 묻히지 않는다`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPublicShellApi(page);
    await page.addInitScript((value) => {
      window.sessionStorage.setItem("wave-intro-seen-v2", "1");
      window.localStorage.setItem("wave-theme", value as string);
    }, theme);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);

    for (const selector of CASES) {
      const measured = await samples(page, selector);
      expect(measured, `${selector}을 찾지 못했다`).not.toEqual([]);
      for (const sample of measured) {
        const ratio = contrastRatio(sample.color, sample.background);
        expect(ratio, `${selector} · ${sample.text} 대비 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}
