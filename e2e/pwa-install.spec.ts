import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";

test("설치 프롬프트는 환경설정에서 사용자가 설치 버튼을 누를 때만 연다", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("wave-intro-seen-v2", "1");
    window.localStorage.setItem("wave-theme", "dark");
  });
  await page.goto("/");
  await page.evaluate(() => {
    const testWindow = window as Window & { __waveInstallPromptCalls?: number };
    testWindow.__waveInstallPromptCalls = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.defineProperties(event, {
      prompt: { value: async () => { testWindow.__waveInstallPromptCalls = (testWindow.__waveInstallPromptCalls || 0) + 1; } },
      userChoice: { value: Promise.resolve({ outcome: "accepted", platform: "web" }) },
    });
    window.dispatchEvent(event);
  });
  await expect.poll(() => page.evaluate(() => (window as Window & { __waveInstallPromptCalls?: number }).__waveInstallPromptCalls)).toBe(0);

  await page.locator("summary[aria-label='환경설정 열기']").first().click();
  const panel = page.locator(".preference-panel").first();
  const install = panel.getByRole("button", { name: "W.A.V.E 앱 설치" });
  await expect(install).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as Window & { __waveInstallPromptCalls?: number }).__waveInstallPromptCalls)).toBe(0);
  let results = await new AxeBuilder({ page }).include(".preference-panel").analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);

  await install.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => (window as Window & { __waveInstallPromptCalls?: number }).__waveInstallPromptCalls)).toBe(1);
  await expect(panel.getByText("앱 설치됨")).toBeVisible();
  await panel.getByRole("button", { name: "라이트모드" }).click();
  results = await new AxeBuilder({ page }).include(".preference-panel").analyze();
  expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
});

test("설치 이벤트가 없으면 자동 요청 없이 수동 홈 화면 추가 경로를 설명한다", async ({ page }) => {
  await mockPublicShellApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/");
  await page.locator("summary[aria-label='환경설정 열기']").first().click();
  const panel = page.locator(".preference-panel").first();
  await expect(panel.getByText("홈 화면에 추가", { exact: true })).toBeVisible();
  await expect(panel.getByText(/브라우저 메뉴에서/)).toBeVisible();
  await expect(panel.getByRole("button", { name: "W.A.V.E 앱 설치" })).toHaveCount(0);
});
