import { expect, test, type Page } from "@playwright/test";

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

async function mockCommunity(page: Page) {
  const now = Date.now();
  const post = {
    id: "contrast-post",
    category: "place",
    title: "경사로와 쉬어갈 곳을 확인했어요",
    content: "현장에서 확인한 무장애 여행 정보입니다.",
    region: "창원",
    placeId: "1001",
    placeName: "경남도립미술관",
    authorName: "여행자",
    createdAt: now,
    updatedAt: now,
    commentCount: 2,
    likeCount: 4,
    likedByMe: false,
    isOwner: false,
  };
  await page.route("**/api/auth/get-session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "null",
  }));
  await page.route("**/api/community/posts**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ posts: [post], page: 1, hasMore: false }),
  }));
}

async function assertContrast(page: Page, selector: string, name: string) {
  const samples = await page.locator(selector).evaluateAll((nodes) => nodes
    .filter((node) => {
      const element = node as HTMLElement;
      return element.offsetWidth > 0 && element.offsetHeight > 0;
    })
    .map((node) => {
      const parse = (value: string) => (value.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
      const style = getComputedStyle(node);
      let background = style.backgroundColor;
      let walker: Element | null = node;
      while (walker && (background === "rgba(0, 0, 0, 0)" || background === "transparent")) {
        walker = walker.parentElement;
        background = walker ? getComputedStyle(walker).backgroundColor : "rgb(255, 255, 255)";
      }
      return { color: parse(style.color), background: parse(background), text: node.textContent?.trim() || "" };
    }));

  expect(samples.length, `${name}(${selector})을 찾지 못했다`).toBeGreaterThan(0);
  for (const sample of samples) {
    const ratio = contrastRatio(sample.color, sample.background);
    expect(ratio, `${name} “${sample.text}” 대비 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
  }
}

const TARGETS = [
  [".community-tabs button", "게시판 탭"],
  [".community-card-meta time", "게시 시각"],
  [".community-place-tag", "장소 태그"],
  [".community-list footer span", "작성자와 반응 수"],
  [".community-pagination button", "페이지 이동"],
  [".community-footer p", "커뮤니티 안내"],
  [".community-footer a", "여행 설계 링크"],
] as const;

for (const theme of ["light", "dark"] as const) {
  test(`${theme} 테마에서 커뮤니티 핵심 텍스트 대비를 지킨다`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockCommunity(page);
    await page.addInitScript((selectedTheme) => {
      window.localStorage.setItem("wave-theme", selectedTheme);
    }, theme);
    await page.goto("/community", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".community-list article")).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);

    for (const [selector, name] of TARGETS) await assertContrast(page, selector, name);
  });
}
