import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

for (const locale of ["ko", "en"] as const) {
  test(`${locale} help establishes focus when shown and traps immediate reverse Tab on repeated opens`, async ({ page }) => {
    await mockPublicShellApi(page);
    await mockPlannerApi(page);
    await page.route("**/api/community/posts?**", (route) => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
    await page.addInitScript((value) => {
      localStorage.setItem("wave-locale", value);
      document.addEventListener("DOMContentLoaded", () => {
        let previouslyOpen = false;
        new MutationObserver(() => {
          const dialog = document.querySelector('[role="dialog"]');
          if (dialog && !previouslyOpen) document.documentElement.dataset.helpFocusAtOpen = String(dialog.contains(document.activeElement));
          previouslyOpen = Boolean(dialog);
        }).observe(document.body, { childList: true, subtree: true });
      });
    }, locale);
    for (const path of ["/", "/planner", "/community", "/travel-book"]) {
      await page.goto(path);
      const trigger = page.getByRole("button", { name: locale === "en" ? "Help" : "도움말", exact: true });
      await expect(trigger).toBeEnabled();
      for (let attempt = 0; attempt < 2; attempt++) {
        await trigger.focus();
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-help-focus-at-open", "true");
        await page.keyboard.press("Shift+Tab");
        expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
        await page.keyboard.press("Escape");
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
      }
    }
  });
}
