import { expect, test, type Page } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

/**
 * 로그인·가입 화면의 표면 색은 흰색 계열로 고정돼 있었다. 어두운 화면에서
 * 배경이 그대로 밝게 남아 그 위 글자가 대비 1.02까지 떨어졌고, 배경만 어둡게
 * 바꾸고 글자를 두어 반대 방향으로 묻히는 곳도 있었다.
 */

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

async function measure(page: Page, selector: string) {
  return page.evaluate((target) => {
    const node = document.querySelector(target);
    if (!node) return null;
    const parse = (value: string) => (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    let background = getComputedStyle(node).backgroundColor;
    let walker: Element | null = node;
    while (walker && (background === "rgba(0, 0, 0, 0)" || background === "transparent")) {
      walker = walker.parentElement;
      background = walker ? getComputedStyle(walker).backgroundColor : "rgb(255, 255, 255)";
    }
    return { color: parse(getComputedStyle(node).color), background: parse(background) };
  }, selector);
}

const CASES = [
  { selector: ".auth-journey-preview > span small", name: "가입 안내 보조 설명" },
  { selector: ".auth-journey-preview > span b", name: "가입 안내 제목" },
  { selector: ".auth-journey-preview > span i", name: "가입 안내 번호" },
  { selector: ".password-field button", name: "비밀번호 보기 버튼" },
  { selector: ".auth-trust", name: "계정 보안 안내" },
];

for (const theme of ["dark", "light"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 화면에서 로그인 안내 글자가 배경에 묻히지 않는다`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPublicShellApi(page);
    await page.addInitScript((value) => {
      window.sessionStorage.setItem("wave-intro-seen-v2", "1");
      window.localStorage.setItem("wave-theme", value as string);
    }, theme);

    for (const path of ["/login", "/register"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1_500);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);

      for (const item of CASES) {
        const sample = await measure(page, item.selector);
        if (!sample) continue;
        const ratio = contrastRatio(sample.color, sample.background);
        expect(ratio, `${path} ${item.name} 대비 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
}
