import { expect, type Page } from "@playwright/test";

/** Follow the public navigation path before using a nested help/preferences action. */
export async function openSupportMenu(page: Page) {
  const menu = page.locator(".wave-support-menu");
  if (await menu.count()) {
    // An inert server-rendered menu ignores focus; wait for its actual readiness.
    await expect(menu).toHaveAttribute("aria-busy", "false");
    if (await menu.getAttribute("data-open") !== "true") {
      const trigger = menu.locator(":scope > .wave-support-trigger");
      // Landing navigation intentionally hides while scrolling down. Keyboard
      // focus reveals it through the real focusin handler before pointer use.
      await trigger.focus();
      await expect(trigger).toBeFocused();
      await trigger.click();
    }
    await expect(menu).toHaveAttribute("data-open", "true");
  }
}
