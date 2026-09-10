import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

test("OS 동작 줄이기는 저장된 full보다 우선하고 부분 번역 중 문서 언어는 한국어를 유지한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.localStorage.setItem("wave-motion", "full");
    window.localStorage.setItem("wave-locale", "zh-Hans");
  });
  await mockPublicShellApi(page);
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await page.locator("details.preference-controls > summary").click();
  await expect(page.locator(".motion-toggle")).toHaveCount(0);
  await expect(page.locator(".preference-panel > p")).toContainText("운영체제의 동작 줄이기 설정");
  expect(await page.evaluate(() => localStorage.getItem("wave-motion"))).toBeNull();
});

test("320px 공개 화면은 주요 메뉴와 Escape 초점 복귀를 제공한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "주요 메뉴 열기" });
  await expect(trigger).toBeVisible();
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox?.width || 0).toBeGreaterThanOrEqual(44);
  expect(triggerBox?.height || 0).toBeGreaterThanOrEqual(44);

  await trigger.click();
  const mobileNav = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
  await expect(mobileNav).toBeVisible();
  const linkSizes = await mobileNav.getByRole("link").evaluateAll((links) => links.map((link) => {
    const rect = link.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }));
  expect(linkSizes).toHaveLength(5);
  for (const size of linkSizes) {
    expect(size.width).toBeGreaterThanOrEqual(44);
    expect(size.height).toBeGreaterThanOrEqual(44);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "주요 메뉴 열기" })).toBeFocused();
  await expect(mobileNav).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("skip-link는 스크롤뿐 아니라 본문 초점도 실제로 옮긴다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.goto("/");

  const skip = page.getByRole("link", { name: /소개 바로가기|跳至正文/ });
  // load can precede React revealing the streamed page from hidden #S:0.
  // Start keyboard interaction when the page exists in the visible document.
  await expect(skip).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("story");
});

test("1363px 공개 화면의 핵심 조작은 보이는 44px 면적을 유지한다", async ({ page }) => {
  await page.setViewportSize({ width: 1363, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.goto("/");

  // Streaming HTML can still be inside the hidden Suspense segment after load.
  // Measure the displayed, interactive page while retaining every target and size check.
  await expect(page.locator(".landing-header .brand")).toBeVisible();
  await expect(page.locator(".landing-header .help-button")).toBeEnabled();
  const targets = page.locator(".landing-header .brand, .landing-header nav a, .landing-header .landing-start, .landing-actions a[href='/planner']");
  const sizes = await targets.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { name: node.textContent?.trim() || node.getAttribute("aria-label") || "조작", width: rect.width, height: rect.height };
  }));
  // The 18 selectors now live in the Planner; retain the combined target inventory.
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  await expect(page.locator(".region-picker-list button")).toHaveCount(19);
  sizes.push(...await page.locator(".region-picker-list button").evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { name: node.textContent?.trim() || "지역", width: rect.width, height: rect.height };
  })));
  expect(sizes.length).toBeGreaterThanOrEqual(25);
  for (const size of sizes) {
    expect(size.width, `${size.name} 너비`).toBeGreaterThanOrEqual(44);
    expect(size.height, `${size.name} 높이`).toBeGreaterThanOrEqual(44);
  }
});

for (const width of [320, 390]) {
  test(`${width}px 홈 링크는 작은 로고와 44px 조작 영역, 키보드 초점을 유지한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 720 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/**", (route) => route.abort());
    await mockPublicShellApi(page);
    await page.goto("/");

    const home = page.getByRole("link", { name: "W.A.V.E 홈", exact: true });
    const skip = page.getByRole("link", { name: "소개 바로가기", exact: true });
    await expect(home).toBeVisible();
    await expect(skip).toBeVisible();
    await expect(home.locator(".brand-mark")).toHaveCSS("width", "26px");
    await page.keyboard.press("Tab");
    await expect(skip).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(home).toBeFocused();
    await expect(home).toHaveCSS("outline-style", "solid");
    await expect(home).toHaveCSS("outline-width", "3px");

    const box = await home.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width, "홈 링크 너비").toBeGreaterThanOrEqual(44);
    expect(box!.height, "홈 링크 높이").toBeGreaterThanOrEqual(44);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(720);
    expect(await home.evaluate((link) => {
      const rect = link.getBoundingClientRect();
      return [rect.left + 1, rect.right - 1].every((x) => link.contains(document.elementFromPoint(x, rect.top + rect.height / 2)));
    }), "로고 양옆으로 넓힌 영역도 홈 링크를 가리킨다").toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await testInfo.attach("home-link-metrics", { body: JSON.stringify({ viewport: { width, height: 720 }, link: box }), contentType: "application/json" });
    await page.screenshot({ path: testInfo.outputPath("home-link-keyboard-focus.png") });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#top$/);
    await expect(page.locator("#top")).toBeInViewport();
  });
}

test("지도 도구 패널은 컨트롤 관계와 Escape 초점 복귀를 유지한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  await chooseTripConditions(page);

  const trigger = page.locator(".map-command-bar").getByRole("button", { name: /출발·도착/ });
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toHaveAttribute("aria-controls", "map-panel-route");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator("#map-panel-route");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: /설정 닫기/ })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect(panel).toHaveCount(0);
});

test("플래너 헤더는 스크롤 뒤에도 키보드로 돌아갈 수 있다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  await chooseTripConditions(page);
  await page.getByRole("heading", { name: "경남도립미술관" }).first().waitFor();

  const header = page.locator(".reference-header");
  await page.evaluate(() => window.scrollTo(0, 1_500));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  const home = header.getByRole("link", { name: "W.A.V.E 소개 홈" });
  await home.focus();
  await expect(home).toBeFocused();
  await expect(home).toBeInViewport();
});
