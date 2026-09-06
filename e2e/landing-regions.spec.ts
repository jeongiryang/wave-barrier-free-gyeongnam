import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test("실제 경계와 18개 텍스트 선택 대안은 같은 지역을 가리킨다", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/");
  await page.waitForFunction(() => Boolean((window as Window & { __VINEXT_HYDRATED_AT?: number }).__VINEXT_HYDRATED_AT));
  const section = page.locator("#regions");
  await section.scrollIntoViewIfNeeded();
  const surface = section.locator("svg.region-boundary-surface");
  await expect(surface).toHaveAttribute("viewBox", "0 0 800 814");
  const shapes = surface.locator("[data-region-boundary]");
  const markers = section.locator("button[data-region-marker]");
  await expect(shapes).toHaveCount(18);
  await expect(markers).toHaveCount(18);
  await expect(markers.locator(".region-marker-dot")).toHaveCount(18);
  const expectedNames = ["거창", "합천", "창녕", "밀양", "양산", "함양", "산청", "의령", "함안", "김해", "창원", "하동", "진주", "사천", "고성", "남해", "통영", "거제"];
  expect((await markers.allTextContents()).map((value) => value.trim())).toEqual(expectedNames);
  expect((await shapes.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-region-boundary")))).sort()).toEqual([...expectedNames].sort());
  await expect(section.locator('[data-region-marker][aria-pressed="true"]')).toHaveCount(1);
  await expect(surface.locator('[data-selected="true"]')).toHaveCount(1);
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
  await expect(section.locator(".selected-region strong")).toHaveText("거창");
});

test("랜딩 기능 데모는 한국어 순서와 비대화형 미리보기 계약을 지킨다", async ({ page }) => {
  let communityRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/community/posts") communityRequests += 1;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/", { waitUntil: "networkidle" });

  const labels = await page.locator(".product-stories .section-kicker").allTextContents();
  expect(labels.map((value) => value.trim())).toEqual(["01 · 여행 조건", "02 · 추천 근거", "03 · 하루 일정", "04 · 이동 경로", "05 · 상황 대응", "06 · 내 일정"]);
  await expect(page.locator(".product-preview button")).toHaveCount(0);
  await expect(page.locator(".route-demo-path")).toHaveCount(1);
  await expect(page.locator(".route-demo-vehicle")).toHaveCount(1);
  await expect(page.locator(".community-feature-preview")).toHaveCount(1);
  expect(await page.locator(".community-feature-preview .community-feature-card").count()).toBeGreaterThan(0);
  expect(communityRequests).toBe(0);
});

test("5초가 넘는 반복 시연은 화면 밖에서 멈추고 사용자가 정지할 수 있다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const routeStory = page.locator(".route-story");
  const vehicle = routeStory.locator(".route-demo-vehicle");
  await expect(page.locator(".landing-page")).toHaveClass(/\bmotion-ready\b/);
  await expect(routeStory).not.toHaveClass(/\bis-visible\b/);
  const repeating = await vehicle.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      duration: Number.parseFloat(style.animationDuration),
      iterations: style.animationIterationCount,
      state: style.animationPlayState,
    };
  });
  expect(repeating.duration).toBeGreaterThan(5);
  expect(repeating.iterations).toBe("infinite");
  expect(repeating.state).toBe("paused");

  await routeStory.scrollIntoViewIfNeeded();
  await expect(routeStory).toHaveClass(/\bis-visible\b/);
  await expect.poll(() => vehicle.evaluate((node) => getComputedStyle(node).animationPlayState)).toBe("running");

  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => routeStory.evaluate((node) => node.classList.contains("is-visible"))).toBe(false);
  await expect.poll(() => vehicle.evaluate((node) => getComputedStyle(node).animationPlayState)).toBe("paused");

  await page.locator("summary[aria-label='환경설정 열기']").click();
  const motionToggle = page.locator("button.motion-toggle");
  await expect(motionToggle).toHaveAccessibleName("동작 효과 줄이기");
  await motionToggle.click();
  await expect(motionToggle).toHaveAttribute("aria-pressed", "true");
  await expect(motionToggle).toHaveAccessibleName("동작 효과 켜기");
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.motion)).toBe("calm");

  const staticState = await vehicle.evaluate((node) => {
    const style = getComputedStyle(node);
    return { animationName: style.animationName, opacity: style.opacity };
  });
  expect(staticState).toEqual({ animationName: "none", opacity: "1" });

  await page.evaluate(() => window.localStorage.removeItem("wave-motion"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.motion)).toBe("calm");
  expect(await vehicle.evaluate((node) => getComputedStyle(node).animationName)).toBe("none");
});
