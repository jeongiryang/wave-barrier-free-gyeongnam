import { openSupportMenu } from "./support-menu";
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
    const parse = (value: string) => (value.match(/[\d.]+/g) || []).map(Number);
    const layers: number[][] = [];
    let walker: Element | null = node;
    while (walker) {
      const layer = parse(getComputedStyle(walker).backgroundColor);
      layers.unshift(layer);
      if ((layer[3] ?? 1) === 1) break;
      walker = walker.parentElement;
    }
    // Alpha is part of the approved glass surface. Treating rgba(255,255,255,.04)
    // as opaque white reported a false contrast failure on the dark panel.
    const blend = (under: number[], over: number[]) => under.map((value, index) => (over[index] ?? 0) * (over[3] ?? 1) + value * (1 - (over[3] ?? 1)));
    const background = layers.reduce(blend, [255, 255, 255]);
    return {
      background,
      color: blend(background, parse(getComputedStyle(node).color)),
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
  [".preference-panel-heading b", "패널 제목"],
  [".preference-row b", "설정 이름"],
  [".preference-row small", "설정 상태"],
  [".preference-row [role='combobox']", "언어 선택"],
  [".preference-row em", "설정 값"],
] as const;

for (const theme of ["light", "dark"] as const) {
  test(`${theme} 테마에서 환경설정 전체의 텍스트 대비를 지킨다`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPublicShellApi(page);
    await page.route("**/api/community/posts**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ posts: [], page: 1, hasMore: false }),
    }));
    await page.addInitScript((selectedTheme) => {
      window.sessionStorage.setItem("wave-arrival-session-v1", "done");
      window.localStorage.setItem("wave-theme", selectedTheme);
    }, theme);
    await page.goto("/community", { waitUntil: "domcontentloaded" });
    await openSupportMenu(page);
    await page.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ }).click();
    await expect(page.locator(".motion-toggle")).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-motion", "full");
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);

    for (const [selector, name] of TARGETS) await assertContrast(page, selector, name);
  });
}
