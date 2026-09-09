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
  for (const selector of [".needs-demo", ".community-demo"]) {
    const demo = page.locator(selector);
    await demo.scrollIntoViewIfNeeded();
    await expect(demo).toHaveAttribute("data-step", "3");
    await expect(demo.locator("button, input, textarea, select")).toHaveCount(0);
  }
  await expect(page.locator(".needs-demo [data-selected=true]")).toHaveCount(2);
  await expect(page.locator(".community-demo .demo-post-preview")).toHaveAttribute("data-shown", "true");
  expect(writes).toEqual([]); expect(requests).toEqual([]);
});

test("유한한 시연은 화면 밖에서 멈추고 OS 감소 설정에서는 완성된 상태를 유지한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await mockPublicShellApi(page);
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  await page.clock.install(); await page.goto("/");
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  const demo = page.locator(".needs-demo");
  await expect(demo).toHaveAttribute("data-running", "false");
  await demo.scrollIntoViewIfNeeded(); await expect(demo).toHaveAttribute("data-running", "true");
  await page.clock.fastForward(1400); await expect(demo).toHaveAttribute("data-step", "1");
  await page.locator("#top").evaluate(node => node.scrollIntoView({ behavior: "instant" }));
  await expect(demo).toHaveAttribute("data-running", "false");
  await page.clock.fastForward(20000); await expect(demo).toHaveAttribute("data-step", "1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(demo).toHaveAttribute("data-step", "3");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  await expect(page.locator("button.motion-toggle")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");
  await expect(demo).toHaveAttribute("data-step", "3");
  await expect(demo).toHaveAttribute("data-running", "false");
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
  await page.mouse.move(0, 0);
  await expect(stage).toHaveAttribute("data-running", "true");
  const initialRegion = await stage.getAttribute("data-active-region");

  const pauseName = locale === "en" ? "Pause automatic region changes" : "지역 자동 전환 일시정지";
  const resumeName = locale === "en" ? "Resume automatic region changes" : "지역 자동 전환 재개";
  const rotation = page.getByRole("button", { name: pauseName });
  const target = await rotation.boundingBox();
  expect(target?.width).toBeGreaterThanOrEqual(44);
  expect(target?.height).toBeGreaterThanOrEqual(44);
  await rotation.focus();
  await rotation.press("Space");

  await expect(stage).toHaveAttribute("data-running", "false");
  await expect(page.getByRole("button", { name: resumeName })).toHaveAttribute("aria-pressed", "true");
  await expect(stage.locator(".region-showcase-progress")).toHaveCSS("animation-name", "none");
  await page.clock.fastForward(9000);
  await expect(stage).toHaveAttribute("data-active-region", initialRegion || "");

  const resume = page.getByRole("button", { name: resumeName });
  await resume.press("Space");
  await expect(stage).toHaveAttribute("data-running", "true");
  await expect(page.getByRole("button", { name: pauseName })).toHaveAttribute("aria-pressed", "false");
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
    await expect(page.getByRole("button", { name: resumeName })).toHaveAttribute("aria-pressed", "true");
    await expect(stage).toHaveAttribute("data-running", "false");
  }
  expect((await new AxeBuilder({ page }).include("#regions").analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
