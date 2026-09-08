import { expect, test } from "@playwright/test";
import { deliverNearby, nearbyPlace, openNearby } from "./nearby-fixtures";

for (const width of [390, 1366]) test(`all fifteen nearby places remain keyboard reachable at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
  const panel = await openNearby(page, true);
  await panel.getByRole("button", { name: "Restaurants", exact: true }).click();
  await deliverNearby(page, 0, "OK", Array.from({ length: 15 }, (_, index) => nearbyPlace(index + 1)));
  await expect(panel.locator("article")).toHaveCount(15);
  await panel.getByRole("button", { name: "Search nearby again", exact: true }).focus();
  for (let index = 0; index < 15; index += 1) {
    const article = panel.locator("article").nth(index);
    for (const target of [article.getByRole("button"), article.getByRole("link")]) {
      await page.keyboard.press("Tab");
      await expect(target).toBeFocused();
      expect(await target.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { size: box.width >= 44 && box.height >= 44, reachable: element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)) };
      })).toEqual({ size: true, reachable: true });
    }
  }
  await expect(panel.locator("article").last()).toContainText("검증 장소 15");
  await page.screenshot({ path: testInfo.outputPath(`nearby-last-place-${width}.png`) });
});
