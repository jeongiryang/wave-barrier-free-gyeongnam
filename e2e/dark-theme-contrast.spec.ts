import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

/**
 * 어두운 화면에서 `--ink`는 밝은 색이 된다. 그 위에 글자색을 `#fff`로 고정해 두면
 * 흰 글자가 밝은 배경 위에 남아 대비 1.11로 사실상 보이지 않는다.
 * CLAUDE.md: "어두운 구역을 밝게 바꿀 때는 안쪽 글자색도 함께 바꾼다."
 */

function relativeLuminance([r, g, b]: number[]) {
  const channel = (value: number) => {
    const ratio = value / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: number[], background: number[]) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

async function measure(page: Page, selector: string) {
  return page.evaluate((target) => {
    const node = document.querySelector(target);
    if (!node) return null;
    const parse = (value: string) => (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
    const style = getComputedStyle(node);
    let background = style.backgroundColor;
    let walker: Element | null = node;
    while (walker && (background === "rgba(0, 0, 0, 0)" || background === "transparent")) {
      walker = walker.parentElement;
      background = walker ? getComputedStyle(walker).backgroundColor : "rgb(255, 255, 255)";
    }
    return { color: parse(style.color), background: parse(background) };
  }, selector);
}

const CASES: Array<{ path: string; selector: string; name: string }> = [
  { path: "/", selector: ".landing-start", name: "랜딩 시작 버튼" },
  { path: "/community", selector: ".community-tabs button[aria-pressed='true']", name: "선택된 게시판 탭" },
  { path: "/community", selector: ".community-footer", name: "커뮤니티 푸터" },
  { path: "/login", selector: ".auth-header-action", name: "로그인 헤더 버튼" },
];

test("어두운 화면에서 짙은 배경 위 글자가 배경에 묻히지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("wave-intro-seen-v2", "1");
    window.localStorage.setItem("wave-theme", "dark");
  });

  for (const item of CASES) {
    await page.goto(item.path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe("dark");

    const sample = await measure(page, item.selector);
    expect(sample, `${item.name}(${item.selector})을 찾지 못했다`).not.toBeNull();
    if (!sample) continue;
    const ratio = contrastRatio(sample.color, sample.background);
    expect(ratio, `${item.name} 대비 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  }
});

test("밝은 화면에서도 같은 요소의 대비가 유지된다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("wave-intro-seen-v2", "1");
    window.localStorage.setItem("wave-theme", "light");
  });

  for (const item of CASES) {
    await page.goto(item.path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1_500);
    const sample = await measure(page, item.selector);
    if (!sample) continue;
    const ratio = contrastRatio(sample.color, sample.background);
    expect(ratio, `${item.name} 대비 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  }
});
