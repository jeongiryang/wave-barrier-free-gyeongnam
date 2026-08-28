import { expect, test, type Page } from "@playwright/test";
import { findLowContrastText, formatFindings } from "./contrast";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

/**
 * 여행 설계 화면의 조건 패널과 이동수단 도구는 표면 색이 흰색 계열로 고정돼
 * 있었다. 어두운 화면에서 표면만 밝게 남아 그 위 글자가 대비 1.11까지 떨어졌다.
 *
 * axe-core는 이 자리를 위반이 아니라 "판정 보류"로 넘겨 놓쳤다. 실제로 그려진
 * 색을 재는 검사(e2e/contrast.ts)로 확인한다.
 */
const SURFACES = [
  { selector: ".theme-grid button:not(.active) span", name: "테마 버튼 이름" },
  { selector: ".theme-grid button:not(.active) small", name: "테마 버튼 설명" },
  { selector: ".map-toolbar > button strong", name: "지도 출발·도착 버튼" },
  { selector: ".step-label b", name: "조건 단계 번호" },
  { selector: ".departure-row button", name: "현재 위치 버튼" },
  { selector: ".select-shell small", name: "선택 상자 보조 문구" },
  { selector: ".transport-details > summary", name: "교통정보 범위 열기" },
];

async function ratioFor(page: Page, selector: string) {
  return page.evaluate((target) => {
    const node = document.querySelector(target);
    if (!node) return null;
    const rgba = (value: string) => {
      const parts = (value.match(/[\d.]+/g) || []).map(Number);
      return { r: parts[0] ?? 0, g: parts[1] ?? 0, b: parts[2] ?? 0, a: parts.length > 3 ? parts[3] : 1 };
    };
    const over = (top: ReturnType<typeof rgba>, base: ReturnType<typeof rgba>) => ({
      r: top.r * top.a + base.r * (1 - top.a),
      g: top.g * top.a + base.g * (1 - top.a),
      b: top.b * top.a + base.b * (1 - top.a),
      a: 1,
    });
    const luminance = (c: { r: number; g: number; b: number }) => {
      const channel = (value: number) => {
        const ratio = value / 255;
        return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
    };
    const stack: ReturnType<typeof rgba>[] = [];
    for (let item: Element | null = node; item; item = item.parentElement) {
      const own = getComputedStyle(item);
      if (own.backgroundImage && own.backgroundImage !== "none") return null;
      const colour = rgba(own.backgroundColor);
      if (colour.a > 0) stack.push(colour);
      if (colour.a >= 1) break;
    }
    if (!stack.length || stack[stack.length - 1].a < 1) return null;
    let base = stack[stack.length - 1];
    for (let index = stack.length - 2; index >= 0; index -= 1) base = over(stack[index], base);
    const foreground = rgba(getComputedStyle(node).color);
    const light = Math.max(luminance(foreground), luminance(base));
    const dark = Math.min(luminance(foreground), luminance(base));
    return Math.round(((light + 0.05) / (dark + 0.05)) * 100) / 100;
  }, selector);
}

for (const theme of ["dark", "light"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 화면에서 여행 설계 조건 패널이 읽힌다`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPublicShellApi(page);
    await mockPlannerApi(page);
    await page.addInitScript((value) => {
      window.sessionStorage.setItem("wave-intro-seen-v2", "1");
      window.localStorage.setItem("wave-theme", value as string);
    }, theme);
    await page.goto("/planner", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_200);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);

    for (const surface of SURFACES) {
      const ratio = await ratioFor(page, surface.selector);
      if (ratio === null) continue;
      expect(ratio, `${surface.name}(${surface.selector}) 대비 ${ratio}`).toBeGreaterThanOrEqual(4.5);
    }
  });
}

for (const theme of ["dark", "light"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 화면에 읽기 매우 어려운 글자가 남지 않는다`, async ({ page }) => {
    // 여행 설계 화면은 아직 모든 글자가 4.5를 넘지는 못한다. 다만 "거의 같은
    // 색"인 자리는 없어야 한다. 남은 2.5~4.5 구간은 별도 작업 단위로 다룬다.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPublicShellApi(page);
    await mockPlannerApi(page);
    await page.addInitScript((value) => {
      window.sessionStorage.setItem("wave-intro-seen-v2", "1");
      window.localStorage.setItem("wave-theme", value as string);
    }, theme);
    await page.goto("/planner", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2_200);

    const severe = (await findLowContrastText(page)).filter((item) => item.ratio < 2.5);
    expect(severe, `대비 2.5 미만\n${formatFindings("/planner", severe)}`).toEqual([]);
  });
}
