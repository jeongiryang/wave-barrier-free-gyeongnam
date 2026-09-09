import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test.beforeEach(async ({ page }) => { await mockPublicShellApi(page); });

test("first entry is a full viewport cinematic with immediately usable keyboard controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await expect(intro).toBeVisible();
  await expect(intro.locator("video")).toHaveAttribute("src", "/media/wave-story/intro-ocean.mp4");
  await intro.getByRole("button", { name: "영상 일시정지" }).click();
  expect(await intro.evaluate(node => {
    const r = node.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, viewport: [innerWidth, innerHeight], modal: node.matches(":modal") };
  })).toEqual({ x: 0, y: 0, width: page.viewportSize()!.width, height: page.viewportSize()!.height, viewport: [page.viewportSize()!.width, page.viewportSize()!.height], modal: true });
  await expect(intro.getByRole("link", { name: "바로 여행 계획하기" })).toHaveAttribute("href", "/planner");
  expect(await intro.locator("video").evaluate((v: HTMLVideoElement) => v.muted)).toBe(true);
  const skip = intro.getByRole("button", { name: "소개로 건너뛰기" });
  await skip.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(intro.getByRole("link", { name: "바로 여행 계획하기" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(skip).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("fullscreen-cinematic.png") });
  const audit = await new AxeBuilder({ page }).analyze();
  expect(audit.violations).toEqual([]);
  await page.keyboard.press("Enter");
  await expect(intro).toBeHidden();
  await expect(page.locator("#landing-title")).toBeFocused();
  await expect(page.locator(".landing-hero .landing-actions a")).toBeVisible();
});

test("a completed session stays on Landing after reload and explicit replay returns focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await intro.getByRole("button", { name: "소개로 건너뛰기" }).click();
  expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBe("done");
  await page.reload();
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  await expect(intro).toBeHidden();
  await page.getByLabel("환경설정 열기").click();
  const replay = page.getByRole("button", { name: "인트로 다시보기", exact: true });
  await replay.focus();
  await page.keyboard.press("Enter");
  await expect(intro).toBeVisible();
  const skip = intro.getByRole("button", { name: "소개로 건너뛰기" });
  await expect(skip).toBeFocused();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(skip).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(intro).toBeHidden();
  await expect(replay).toBeFocused();
});

for (const preference of ["reduced", "app-reduced", "save-data"] as const) {
  test(`${preference} has a full-screen static intro without video download`, async ({ page }) => {
    const videoRequests: string[] = [];
    page.on("request", request => { if (request.url().endsWith(".mp4")) videoRequests.push(request.url()); });
    if (preference === "reduced") await page.emulateMedia({ reducedMotion: "reduce" });
    else if (preference === "app-reduced") await page.addInitScript(() => localStorage.setItem("wave-motion", "calm"));
    else await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: Object.assign(new EventTarget(), { saveData: true }), configurable: true }));
    await page.goto("/");
    const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
    await expect(intro).toBeVisible();
    await expect(intro).toHaveAttribute("data-still", "true");
    await expect(intro.locator("video")).not.toHaveAttribute("src");
    await expect(intro.getByRole("heading", { name: "W.A.V.E" })).toBeVisible();
    await expect(intro.getByRole("link", { name: "바로 여행 계획하기" })).toBeVisible();
    expect(videoRequests).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(intro).toBeHidden();
  });
}

test("failed media retains the brand, static scene and a working exit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.route("**/media/wave-story/intro-ocean.mp4", route => route.abort());
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await expect(intro.getByRole("status")).toContainText("영상을 불러오지 못해");
  await expect(intro.locator(".arrival-poster")).toBeVisible();
  await expect(intro.getByRole("heading", { name: "W.A.V.E" })).toBeVisible();
  await intro.getByRole("button", { name: "소개로 건너뛰기" }).click();
  await expect(page.locator("#landing-title")).toBeFocused();
});

test("media end hands off to the actual Hero, not another waiting screen", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await expect.poll(() => intro.locator("video").evaluate((v: HTMLVideoElement) => Number.isFinite(v.duration) && v.duration > 0)).toBe(true);
  await intro.locator("video").evaluate((v: HTMLVideoElement) => { v.currentTime = v.duration - .1; });
  await expect(intro).toBeHidden();
  await expect(page.locator("#landing-title")).toBeFocused();
  await expect(page.locator(".landing-hero .landing-actions a")).toHaveAttribute("href", "/planner");
});

test("runtime reduction keeps the focused media control and stops downloading video", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  const control = intro.locator(".arrival-actions button");
  await expect(control).toHaveText("영상 일시정지");
  await control.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(control).toBeFocused();
  await expect(control).toHaveAttribute("aria-disabled", "true");
  await expect(intro.locator("video")).not.toHaveAttribute("src");
  await page.keyboard.press("Enter");
  await expect(control).toBeFocused();
  await expect(intro.locator("video")).not.toHaveAttribute("src");
  await page.keyboard.press("Escape");
  await expect(page.locator("#landing-title")).toBeFocused();
});

test("denied session storage still allows an immediate exit and explicit replay", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", { get() { throw new DOMException("Storage denied", "SecurityError"); } });
  });
  await page.goto("/");
  const intro = page.getByRole("dialog", { name: "W.A.V.E", exact: true });
  await intro.getByRole("button", { name: "소개로 건너뛰기" }).click();
  await expect(page.locator(".landing-page.motion-ready")).toBeVisible();
  await expect(intro).toBeHidden();
  await page.getByLabel("환경설정 열기").click();
  await page.getByRole("button", { name: "인트로 다시보기", exact: true }).click();
  await expect(intro).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(intro).toBeHidden();
  await expect(page.getByRole("button", { name: "인트로 다시보기", exact: true })).toBeFocused();
});
