import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi, chooseTripConditions } from "./fixtures";

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
  await expect(page.locator(".motion-toggle")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".motion-toggle")).toHaveAttribute("aria-disabled", "true");
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

  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /소개 바로가기|跳至正文/ });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("story");
});

test("1363px 공개 화면의 핵심 조작은 보이는 44px 면적을 유지한다", async ({ page }) => {
  await page.setViewportSize({ width: 1363, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.goto("/");

  const targets = page.locator(".landing-header .brand, .landing-header nav a, .landing-actions a, [data-region-marker]");
  const sizes = await targets.evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect();
    return { name: node.textContent?.trim() || node.getAttribute("aria-label") || "조작", width: rect.width, height: rect.height };
  }));
  expect(sizes.length).toBeGreaterThanOrEqual(25);
  for (const size of sizes) {
    expect(size.width, `${size.name} 너비`).toBeGreaterThanOrEqual(44);
    expect(size.height, `${size.name} 높이`).toBeGreaterThanOrEqual(44);
  }
});

test("지도 도구 패널은 컨트롤 관계와 Escape 초점 복귀를 유지한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner");
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

test("스크롤로 숨은 플래너 헤더는 키보드 초점이 오면 복귀한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner");
  await chooseTripConditions(page);
  await page.getByRole("heading", { name: "경남도립미술관" }).first().waitFor();

  const header = page.locator(".site-header");
  // Result navigation can place the viewport below 1500px. Establish a downward
  // scroll after that navigation, rather than accidentally testing an upward one.
  await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  // The header's animation-frame scroll handler must observe the reset before
  // the next scroll; scrollY changes synchronously before that handler runs.
  await expect(header).not.toHaveClass(/scrolled/);
  await page.evaluate(() => window.scrollTo(0, 1_500));
  await expect(header).toHaveClass(/hidden/);
  await header.getByRole("link", { name: "W.A.V.E 소개 홈" }).focus();
  await expect(header).not.toHaveClass(/hidden/);
  await expect(header.getByRole("link", { name: "W.A.V.E 소개 홈" })).toBeFocused();
});
