import { openSupportMenu } from "./support-menu";
import { expect, test } from "@playwright/test";
import { findLowContrastText, formatFindings } from "./contrast";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

/**
 * 화면 어디에나 있는 공통 요소(환경설정 토글, 지역 칩)와 주요 공개 화면의 글자가
 * 두 테마 모두에서 읽혀야 한다.
 */
const PAGES = ["/", "/planner", "/community", "/community/new", "/photo-course", "/travel-book"];

for (const theme of ["light", "dark"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 화면에서 읽기 어려운 글자가 없다`, async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPublicShellApi(page);
    await mockPlannerApi(page);
    await page.addInitScript((value) => {
      window.sessionStorage.setItem("wave-arrival-session-v1", "done");
      window.localStorage.setItem("wave-theme", value as string);
    }, theme);

    const failures: string[] = [];
    for (const path of PAGES) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2_000);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
      const findings = await findLowContrastText(page);
      if (findings.length) failures.push(formatFindings(path, findings));
    }

    expect(failures, `대비 4.5 미만\n${failures.join("\n")}`).toEqual([]);
  });
}

test("OS 동작 감소에서도 환경설정의 모든 항목은 읽힌다", async ({ page }) => {
  // Keep the contrast regression over every remaining preference after retiring the manual motion control.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("wave-arrival-session-v1", "done");
    window.localStorage.setItem("wave-theme", "dark");
  });
  await page.goto("/community", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);

  await openSupportMenu(page);
  await page.locator("summary[aria-label='환경설정 열기']").first().click();
  await page.waitForTimeout(400);
  await expect(page.locator("button.motion-toggle")).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "calm");

  const findings = await findLowContrastText(page);
  expect(findings, `환경설정과 배경 대비\n${formatFindings("/community", findings)}`).toEqual([]);
});
