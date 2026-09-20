import { expect, type Page } from "@playwright/test";

/** Follow the public navigation path before using a nested help/preferences action. */
export async function openSupportMenu(page: Page) {
  const menu = page.locator(".wave-support-menu");
  if (await menu.count()) {
    if (await menu.getAttribute("data-open") !== "true") {
      await menu.locator(":scope > .wave-support-trigger").click();
    }
    await expect(menu).toHaveAttribute("data-open", "true");
  }
}
