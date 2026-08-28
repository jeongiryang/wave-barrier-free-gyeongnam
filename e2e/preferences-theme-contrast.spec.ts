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

async function assertContrast(page: Page, selector: string, name: string) {
  const samples = await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => {
    const parse = (value: string) => (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    let background = getComputedStyle(node).backgroundColor;
    let walker: Element | null = node;
    while (walker && (background === "rgba(0, 0, 0, 0)" || background === "transparent")) {
      walker = walker.parentElement;
      background = walker ? getComputedStyle(walker).backgroundColor : "rgb(255, 255, 255)";
    }
    return {
      background: parse(background),
      color: parse(getComputedStyle(node).color),
      text: node.textContent?.trim() || node.tagName.toLowerCase(),
    };
  }));

  expect(samples.length, `${name}(${selector})을 찾지 못했다`).toBeGreaterThan(0);
  for (const sample of samples) {
    const ratio = contrastRatio(sample.color, sample.background);
    expect(ratio, `${name} “${sample.text}” 대비 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  }
}

const TARGETS = [
  [".preference-panel header b", "패널 제목"],
  [".preference-panel header small", "패널 설명"],
  [".preference-row b", "설정 이름"],
  [".preference-row small", "설정 상태"],
  [".preference-row select", "언어 선택"],
  [".preference-row em", "설정 값"],
  [".preference-panel > p", "동작 효과 안내"],
] as const;

for (const theme of ["light", "dark"] as const) {
  test(`${theme} 테마에서 움직임 줄이기 설정의 텍스트 대비를 지킨다`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPublicShellApi(page);
    await page.route("**/api/community/posts**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ posts: [], page: 1, hasMore: false }),
    }));
    await page.addInitScript((selectedTheme) => {
      window.sessionStorage.setItem("wave-intro-seen-v2", "1");
      window.localStorage.setItem("wave-theme", selectedTheme);
      window.localStorage.setItem("wave-motion", "calm");
    }, theme);
    await page.goto("/community", { waitUntil: "domcontentloaded" });
    await page.locator(".preference-controls > summary").click();
    await expect(page.locator(".motion-toggle")).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);

    for (const [selector, name] of TARGETS) await assertContrast(page, selector, name);
  });
}
