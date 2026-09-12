import { expect, type Page } from "@playwright/test";

/** Follow the public navigation path before using a nested help/preferences action. */
export async function openSupportMenu(page: Page) {
  const menu = page.locator(".wave-support-menu");
  if (await menu.count()) {
    if (await menu.getAttribute("open") === null) {
      await menu.locator(":scope > summary").click();
    }
    await expect(menu).toHaveAttribute("open", "");
  }
}
