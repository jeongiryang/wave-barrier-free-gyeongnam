import { openNaruTool } from './naru-tool-fixtures';
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, openItinerary } from "./fixtures";

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
  { path: "/community", selector: ".night-category-tabs button[aria-pressed='true']", name: "선택된 게시판 탭" },
  { path: "/community", selector: ".wave-balanced-footer > p", name: "커뮤니티 푸터 안내" },
  { path: "/community", selector: ".night-community-toolbar > .night-primary", name: "후기 작성 (기본 동작 버튼)" },
  { path: "/login", selector: ".auth-submit", name: "로그인 제출 (기본 동작 버튼)" },
  { path: "/login", selector: ".auth-guest a", name: "로그인 없이 둘러보기" },
  { path: "/planner", selector: ".simple-readiness-heading p", name: "출발 전 확인 안내" },
  { path: "/planner", selector: ".simple-readiness-heading button", name: "출발 정보 다시 조회" },
];

async function measureOpaqueGradient(page: Page, selector: string) {
  return page.locator(selector).evaluate(node => {
    const style = getComputedStyle(node);
    const gradient = style.backgroundImage;
    // This probe covers an opaque sRGB linear gradient, not arbitrary images
    // or alpha layers. Reject unsupported paint instead of measuring behind it.
    if (!/^linear-gradient\(/.test(gradient) || /\),\s*(?:url|.*gradient)\(/.test(gradient)) {
      throw new Error(`Expected one opaque linear gradient: ${gradient}`);
    }
    const stops = gradient.match(/rgba?\([^)]+\)/g) || [];
    const remaining = gradient.replace(/^linear-gradient\(/, "").replace(/rgba?\([^)]+\)/g, "");
    if (stops.length < 2 || /\bin\s/.test(gradient) || /[a-z-]+\(/i.test(remaining)) {
      throw new Error(`Unsupported gradient: ${gradient}`);
    }
    const parseOpaque = (color: string) => {
      const channels = (color.match(/[\d.]+/g) || []).map(Number);
      if (channels.length !== 3 && !(channels.length === 4 && channels[3] === 1)) {
        throw new Error(`Expected opaque RGB color: ${color}`);
      }
      return channels.slice(0, 3);
    };
    return { color: parseOpaque(style.color), stops: stops.map(parseOpaque) };
  });
}

for (const theme of ["light", "dark"]) test(`랜딩 그라데이션의 모든 색상은 ${theme} 화면에서 흰 글자 대비를 유지한다`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.addInitScript(value => {
    sessionStorage.setItem("wave-arrival-session-v1", "done");
    localStorage.setItem("wave-theme", value);
  }, theme);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  const selector = ".landing-actions a[href='/planner']";
  await expect(page.locator(selector)).toBeVisible();
  // Visibility and hydration do not promise that streamed route CSS is painted.
  await expect(page.locator(selector)).toHaveCSS("background-image", /linear-gradient\(/);
  const sample = await measureOpaqueGradient(page, selector);
  expect(sample.color).toEqual([255, 255, 255]);
  // With white text, the brightest stop is the worst contrast: luminance is
  // convex along an opaque sRGB interpolation, so no interior is brighter.
  const worst = Math.min(...sample.stops.map(stop => contrastRatio(sample.color, stop)));
  expect(worst, `랜딩 시작 버튼 그라데이션 최소 대비 ${worst.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
});

test("그라데이션 대비 측정은 밝은 중간 색상과 지원하지 않는 배경을 놓치지 않는다", async ({ page }) => {
  await page.setContent('<a style="color:white;background:linear-gradient(90deg,#123,#fff,#234)">검사</a>');
  const sample = await measureOpaqueGradient(page, "a");
  expect(Math.min(...sample.stops.map(stop => contrastRatio(sample.color, stop)))).toBe(1);
  await page.locator("a").evaluate(node => { (node as HTMLElement).style.backgroundImage = "none"; });
  await expect(measureOpaqueGradient(page, "a")).rejects.toThrow("Expected one opaque linear gradient");
  await page.locator("a").evaluate(node => { (node as HTMLElement).style.backgroundImage = "linear-gradient(90deg,transparent,#123)"; });
  await expect(measureOpaqueGradient(page, "a")).rejects.toThrow("Expected opaque RGB color");
  await page.locator("a").evaluate(node => { (node as HTMLElement).style.backgroundImage = "linear-gradient(90deg,rgb(17,34,51),color(display-p3 1 1 1),rgb(34,51,68))"; });
  await expect(measureOpaqueGradient(page, "a")).rejects.toThrow("Unsupported gradient");
});

async function openSample(page: Page, item: typeof CASES[number]) {
  const changedPage = new URL(page.url()).pathname !== item.path;
  // Measure all controls on the same rendered page before navigating again.
  // Reopening community three times and login twice adds unrelated SSR waits.
  if (changedPage) await page.goto(item.path, { waitUntil: "domcontentloaded" });
  if (changedPage && item.path === "/planner") {
    await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
    await expect(page.locator(".simple-place-row").first()).toBeVisible();
    const add = page.getByRole("button", { name: "경남도립미술관 일정에 담기", exact: true });
    if (await add.count()) await add.click();
    await openItinerary(page);
    await openNaruTool(page, "출발 전 확인");
  }
  await expect(page.locator(item.selector)).toBeVisible();
  if (item.path === "/login") await expect(page.locator(".auth-submit")).toBeEnabled();
}

test("어두운 화면에서 짙은 배경 위 글자가 배경에 묻히지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("wave-arrival-session-v1", "done");
    window.localStorage.setItem("wave-theme", "dark");
  });

  for (const item of CASES) {
    await openSample(page, item);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

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
    window.sessionStorage.setItem("wave-arrival-session-v1", "done");
    window.localStorage.setItem("wave-theme", "light");
  });

  for (const item of CASES) {
    await openSample(page, item);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const sample = await measure(page, item.selector);
    expect(sample, `${item.name}(${item.selector})을 찾지 못했다`).not.toBeNull();
    if (!sample) continue;
    const ratio = contrastRatio(sample.color, sample.background);
    expect(ratio, `${item.name} 대비 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  }
});
