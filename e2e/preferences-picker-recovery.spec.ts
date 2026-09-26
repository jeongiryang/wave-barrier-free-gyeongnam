import { openSupportMenu } from "./support-menu";
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

for (const path of ["/planner", "/community"]) {
  test(`language label opens a usable picker without closing its parent on ${path}`, async ({ page }) => {
    await mockPlannerApi(page);
    await mockPublicShellApi(page);
    await page.goto(path);
    await openSupportMenu(page);
    const details = page.locator(".preference-controls");
    await expect(details).toHaveAttribute("aria-busy", "false");
    await details.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ }).click();
    await details.getByText("한국어 전체 지원", { exact: true }).click();
    await expect(details.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ })).toHaveAttribute('aria-expanded', 'true');
    const language = details.getByRole("combobox", { name: "언어", exact: true });
    await expect(language).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(details.getByRole("combobox", { name: "Language", exact: true })).toHaveValue("en");
    await expect(details.getByText("Some pages are in Korean", { exact: true })).toBeVisible();
    // Original Korean content retains the document language; translated
    // sections carry their own language tags under the existing policy.
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    // The first Escape dismisses the native picker. The next leaves the
    // preferences disclosure; do not hide a select while its picker is active.
    await page.keyboard.press("Escape");
    await expect(details.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ })).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press("Escape");
    await expect(details.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ })).toHaveAttribute('aria-expanded', 'false');
    await expect(details.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ })).toBeFocused();
    await details.getByRole('button', { name: /^(환경설정 열기|Open preferences)$/ }).click();
    for (const width of [960, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await details.locator(".preference-panel").screenshot({ path: test.info().outputPath(`preferences-picker-${width}.png`) });
    }
    await page.locator(".night-planner-form h2, .night-banner h1").first().click();
    await expect(details.locator(".preference-panel")).toBeHidden();
  });
}
