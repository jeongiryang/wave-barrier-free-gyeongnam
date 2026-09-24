import { expect, test } from "@playwright/test";
import { prepareStory, storyReady, expectNoOverflow } from "./landing-contract";

test.use({ storageState: { cookies: [], origins: [] } });

for (const motion of ["no-preference", "reduce"] as const) {
  test(`서비스 소개는 마지막 장면 없이 자연스럽게 끝난다 (${motion})`, async ({ page }) => {
    await prepareStory(page);
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto("/");
    await storyReady(page);
    await expect(page.locator("#closing")).toHaveCount(0);
    await expect(page.locator(".landing-page > .wave-balanced-footer")).toBeVisible();
    await expectNoOverflow(page);
  });
}
