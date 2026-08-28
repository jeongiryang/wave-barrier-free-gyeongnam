import { expect, test } from "@playwright/test";
import { findLowContrastText, formatFindings } from "./contrast";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

/**
 * 화면 어디에나 있는 공통 요소(환경설정 토글, 지역 칩)와 주요 공개 화면의 글자가
 * 두 테마 모두에서 읽혀야 한다.
 */
const PAGES = ["/", "/planner", "/community", "/community/new", "/photo-course"];

for (const theme of ["light", "dark"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 화면에서 읽기 어려운 글자가 없다`, async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockPublicShellApi(page);
    await mockPlannerApi(page);
    await page.addInitScript((value) => {
      window.sessionStorage.setItem("wave-intro-seen-v2", "1");
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

test("환경설정의 동작 효과 토글은 켠 상태에서도 읽힌다", async ({ page }) => {
  // 움직임 줄이기 토글 자체가 접근성 기능이다. 켜면 배경이 밝게 바뀌는데
  // 어두운 화면에서 그 배경만 남아 글자가 대비 1.02로 사라졌었다.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("wave-intro-seen-v2", "1");
    window.localStorage.setItem("wave-theme", "dark");
    window.localStorage.setItem("wave-motion", "calm");
  });
  await page.goto("/community", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);

  await page.locator("summary[aria-label='환경설정 열기']").first().click();
  await page.waitForTimeout(400);
  const toggle = page.locator("button.motion-toggle");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  const findings = (await findLowContrastText(page)).filter((item) => item.where.includes("motion-toggle"));
  expect(findings, `동작 효과 토글 대비\n${formatFindings("/community", findings)}`).toEqual([]);
});
