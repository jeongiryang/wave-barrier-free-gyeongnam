import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";
import { regionShowcaseAlbums } from "../features/landing/region-showcase-photos";
import AxeBuilder from "@axe-core/playwright";

test("실제 경계와 18개 텍스트 선택 대안은 같은 지역을 가리킨다", async ({ page }) => {
  await mockPlannerApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/planner");
  await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  const section = page.locator(".region-picker");
  await section.scrollIntoViewIfNeeded();
  await section.locator(".region-map-disclosure summary").click();
  const surface = section.locator("svg");
  await expect(surface).toHaveAttribute("viewBox", "0 0 800 814");
  const shapes = surface.locator("[data-region-boundary]");
  const markers = section.locator(".region-picker-list button:not(:first-child)");
  await expect(shapes).toHaveCount(18);
  await expect(markers).toHaveCount(18);
  const expectedNames = ["거창", "합천", "창녕", "밀양", "양산", "함양", "산청", "의령", "함안", "김해", "창원", "하동", "진주", "사천", "고성", "남해", "통영", "거제"];
  expect((await markers.allTextContents()).map(value => value.trim()).sort()).toEqual([...expectedNames].sort());
  expect((await shapes.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-region-boundary")))).sort()).toEqual([...expectedNames].sort());
  await expect(surface.locator('[data-selected="true"]')).toHaveCount(0);
  await expect(section.locator('[data-region-marker] svg, [data-region-marker] img')).toHaveCount(0);
  await expect(page.locator('img[src*="wikimedia.org"]')).toHaveCount(0);
  const positions = await shapes.evaluateAll((nodes) => {
    const measured: Record<string, { x: number; y: number; width: number; height: number }> = {};
    for (const node of nodes) {
      const box = (node as SVGGraphicsElement).getBBox();
      measured[node.getAttribute("data-region-boundary") || ""] = { x: box.x+box.width/2, y: box.y+box.height/2, width: box.width, height: box.height };
    }
    return measured;
  });
  for (const position of Object.values(positions)) {
    expect(position.width).toBeGreaterThan(0); expect(position.height).toBeGreaterThan(0);
    expect(position.x).toBeGreaterThan(0); expect(position.x).toBeLessThan(800);
    expect(position.y).toBeGreaterThan(0); expect(position.y).toBeLessThan(814);
  }
  expect(positions["거창"].x).toBeLessThan(positions["합천"].x);
  expect(positions["합천"].x).toBeLessThan(positions["창녕"].x);
  expect(positions["창녕"].x).toBeLessThan(positions["양산"].x);
  expect(positions["거창"].y).toBeLessThan(positions["남해"].y);
  const geochang = markers.filter({ hasText: "거창" });
  await geochang.focus(); await geochang.press("Enter");
  await expect(geochang).toBeFocused();
  await expect(geochang).toHaveAttribute("aria-pressed", "true");
  await expect(surface.locator('[data-region-boundary="거창"]')).toHaveAttribute("data-selected", "true");
  await expect(section.locator("svg text")).toHaveText("거창");
});


test("랜딩 기능 데모는 현재 한국어 순서와 비대화형 미리보기 계약을 지킨다", async ({ page }) => {
  const writes: string[] = [], requests: string[] = [];
  page.on("request", request => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(request.url());
    if (/\/api\/(wave|community)/.test(request.url())) requests.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  expect(await page.locator("main > section").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(["top", "regions", "story", "recommendation", "departure", "community", "closing"]);
  await expect(page.locator(".horizon-chapter-copy")).toHaveCount(3);
  await expect(page.locator(".horizon-community-photos img")).toHaveCount(2);
  await expect(page.locator(".horizon-chapters input,.horizon-community input,.horizon-community form")).toHaveCount(0);
  expect(writes).toEqual([]); expect(requests).toEqual([]);
});

test("scroll chapters follow the reader and OS reduction removes crossfade while preserving content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await mockPublicShellApi(page);
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  for(const index of [0,1,2,1,0]) {
    await page.locator(".horizon-chapter-copy").nth(index).evaluate(node=>node.scrollIntoView({block:"center",behavior:"instant"}));
    await expect(page.locator(".horizon-chapters")).toHaveAttribute("data-active-chapter",String(index));
  }
  await page.emulateMedia({reducedMotion:"reduce"});
  await expect(page.locator("html")).toHaveAttribute("data-motion","calm");
  // The global accessibility reset uses 0.001ms to retain transition completion events.
  expect(await page.locator(".horizon-chapter-backdrops > div").first().evaluate(node=>parseFloat(getComputedStyle(node).transitionDuration))).toBeLessThanOrEqual(.001);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion","calm");
  await expect(page.locator(".horizon-chapter-copy")).toHaveCount(3);
  await expect(page.locator("button.motion-toggle")).toHaveCount(0);
});

for (const locale of ["ko", "en"]) for (const width of [320, 390, 1440]) test(`지역 사진 자동 전환은 키보드로 일시정지하고 재개한다 ${locale} ${width}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width, height: 900 });
  await mockPublicShellApi(page);
  await page.addInitScript(locale => {
    sessionStorage.setItem("wave-arrival-session-v1", "done");
    localStorage.setItem("wave-locale", locale);
  }, locale);
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);

  const stage = page.locator("[data-region-stage]");
  await stage.scrollIntoViewIfNeeded();
  await page.mouse.move(-10, -10);
  await expect(stage).toHaveAttribute("data-running", "true");
  const initialRegion = await stage.getAttribute("data-active-region");

  const pauseName = locale === "en" ? "Pause automatic region changes" : "지역 자동 전환 일시정지";
  const resumeName = locale === "en" ? "Resume automatic region changes" : "지역 자동 전환 재개";
  const rotation = stage.locator(".region-rotation-control");
  // Korean source titles retain their language within translated actions.
  await expect(stage.locator("#region-photo-0-name")).toHaveAttribute("lang", "ko");
  await expect(stage.locator("#region-photo-0-action")).toHaveAttribute("lang", locale);
  await expect(stage.locator(".region-featured-card .region-scene-photo img")).toHaveAttribute("lang", "ko");
  await expect(stage.locator(".region-featured-card .region-scene-photo img")).toHaveAttribute("alt", regionShowcaseAlbums[initialRegion!][0].title);
  const target = await rotation.boundingBox();
  expect(target?.width).toBeGreaterThanOrEqual(44);
  expect(target?.height).toBeGreaterThanOrEqual(44);
  // Check first keyboard entry before touch creates a native sequential-focus
  // starting point (mobile WebKit retains the last tapped control).
  await page.locator("#regions").focus();
  await page.keyboard.press("Tab");
  await expect(rotation).toBeFocused();
  await expect(rotation).toHaveAccessibleName(resumeName);
  await expect(stage).toHaveAttribute("data-running", "false");
  await rotation.press("Space");
  await expect(stage).toHaveAttribute("data-running", "true");
  await rotation.press("Space");

  await expect(stage).toHaveAttribute("data-running", "false");
  await expect(rotation).toHaveAccessibleName(resumeName);
  await expect(rotation).not.toHaveAttribute("aria-pressed");
  await expect(stage.locator(".region-showcase-progress")).toHaveCSS("animation-name", "none");
  await page.clock.fastForward(9000);
  await expect(stage).toHaveAttribute("data-active-region", initialRegion || "");

  const resume = page.getByRole("button", { name: resumeName });
  await resume.press("Space");
  await expect(stage).toHaveAttribute("data-running", "true");
  await expect(rotation).toHaveAccessibleName(pauseName);
  await expect(page.getByRole("button", { name: pauseName })).toBeFocused();
  await expect(stage.locator(".region-showcase-progress")).toHaveCSS("animation-name", "region-progress");
  for (let photo = 0; photo < regionShowcaseAlbums[initialRegion!].length; photo++) {
    await expect(stage.locator(".region-photo-album")).toHaveAttribute("data-photo-index", String(photo));
    await page.clock.fastForward(4000);
  }
  await expect(stage).not.toHaveAttribute("data-active-region", initialRegion || "");
  await expect(page.getByRole("button", { name: pauseName })).toBeFocused();
  if (test.info().project.name.includes("mobile") && width === 390) {
    await page.getByRole("button", { name: pauseName }).tap();
    await expect(rotation).toHaveAccessibleName(resumeName);
    await expect(stage).toHaveAttribute("data-running", "false");
    await rotation.tap();
    await expect(rotation).toHaveAccessibleName(pauseName);
    await expect(stage).toHaveAttribute("data-running", "true");
  }
  expect((await new AxeBuilder({ page }).include("#regions").analyze()).violations).toEqual([]);
  // Every keyboard entry stops rotation, including the first control. Leaving
  // the scene or disabling OS reduction never resumes without an explicit action.
  await page.locator("#landing-title").focus();
  await rotation.focus();
  await expect(rotation).toBeFocused();
  await expect(rotation).toHaveAccessibleName(resumeName);
  await page.locator("#landing-title").focus();
  const heldRegion = await stage.getAttribute("data-active-region");
  await page.clock.fastForward(16000);
  await expect(stage).toHaveAttribute("data-active-region", heldRegion!);
  await expect(stage).toHaveAttribute("data-running", "false");
  await stage.scrollIntoViewIfNeeded();
  await page.mouse.move(-10, -10);
  await rotation.focus();
  await expect(rotation).toBeFocused();
  await rotation.press("Space");
  await expect(stage).toHaveAttribute("data-running", "true");
  await stage.locator(".selected-region strong").hover();
  await page.mouse.move(-10, -10);
  await expect(stage).toHaveAttribute("data-running", "false");
  await page.clock.fastForward(16000);
  await expect(stage).toHaveAttribute("data-active-region", heldRegion!);
  await rotation.press("Space");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(rotation).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(rotation).toBeEnabled();
  await expect(rotation).toHaveAccessibleName(resumeName);
  await expect(stage).toHaveAttribute("data-running", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
