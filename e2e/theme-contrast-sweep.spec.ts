import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

/**
 * 두 화면 모두에서 대비 위반이 없어야 한다.
 *
 * 다크 테마는 토큰의 의미를 뒤집는다. 배경만 토큰으로 두고 글자색을 고정하면
 * 한쪽 화면에서 글자가 배경에 묻힌다. 사람 눈으로는 밝은 화면만 보고 넘어가기
 * 쉬우므로, 두 화면을 함께 자동으로 검사한다.
 *
 * 로그인·가입은 별도 작업 단위(PR #191)에서 다루므로 여기서는 제외한다.
 */
const PAGES = ["/", "/planner", "/community", "/community/new", "/photo-course"];

for (const theme of ["dark", "light"] as const) {
  test(`${theme === "dark" ? "어두운" : "밝은"} 화면에 대비 위반이 없다`, async ({ page }) => {
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
      await page.waitForTimeout(2_200);
      expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);

      const results = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
      const contrast = results.violations.find((violation) => violation.id === "color-contrast");
      for (const node of contrast?.nodes ?? []) {
        const summary = (node.failureSummary || "").replace(/\s+/g, " ");
        const ratio = summary.match(/contrast of ([\d.]+)/)?.[1] ?? "?";
        const colors = summary.match(/foreground color: (#[0-9a-f]{6}), background color: (#[0-9a-f]{6})/);
        failures.push(`${path} ${String(node.target[0]).slice(0, 50)} — 대비 ${ratio} (${colors?.[1]} on ${colors?.[2]})`);
      }
    }

    expect(failures, `대비 위반 ${failures.length}건\n${failures.join("\n")}`).toEqual([]);
  });
}
