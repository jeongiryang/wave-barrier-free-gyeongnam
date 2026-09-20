import { enterDeparture, departureItem } from './departure-fixtures';
import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

test("a pointer press near the tool scroll edge keeps the readiness action under the pointer", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page, { crowdRate: 65 });
  await mockPublicShellApi(page);
  await page.goto("/planner");
  await enterDeparture(page); await departureItem(page, '관광 집중률');
  const shortcut = page.locator('.simple-readiness a[href="#crowd"]');
  await shortcut.scrollIntoViewIfNeeded();
  await expect(page.locator(".simple-readiness")).toHaveCSS("opacity", "1");
  // Readiness lives in Naru's scrollable tool surface. Arrange the actual link
  // at that surface's lower edge, preserving the held-pointer regression.
  const scroller = page.locator('.naru-workspace-content').filter({ has: shortcut });
  await expect.poll(() => scroller.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await expect.poll(async () => {
    await shortcut.evaluate(element => {
      let parent = element.parentElement;
      while (parent && !(getComputedStyle(parent).overflowY.match(/auto|scroll/) && parent.scrollHeight > parent.clientHeight)) parent = parent.parentElement;
      if (!parent) throw new Error('Readiness must have a scrollable tool surface');
      const edge = parent.getBoundingClientRect().bottom - parent.clientTop;
      parent.scrollBy({ top: element.getBoundingClientRect().bottom - edge + 1, behavior: 'instant' });
    });
    await shortcut.hover();
    const edge = (await scroller.boundingBox())!.y + (await scroller.boundingBox())!.height - 1;
    return shortcut.evaluate((element, edge) => {
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return Math.abs(box.bottom - edge) <= 1 && hit !== null && element.contains(hit);
    }, edge);
  }).toBe(true);
  await expect(page.getByRole('tab', { name: '여행 도구', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: '나루 대화 닫기', exact: true })).toBeInViewport();
  const before = (await shortcut.boundingBox())!;
  expect(before.y + before.height).toBeLessThanOrEqual(960);
  expect(before.y).toBeGreaterThanOrEqual(0);
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  // A real press can span a rendering frame; releasing must still activate the same link.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(Math.abs((await shortcut.boundingBox())!.y - before.y)).toBeLessThanOrEqual(1);
  await page.mouse.up();
  await expect(page.locator("#layers")).toHaveAttribute("open");
  await expect(page.locator(".impact-response h3")).toBeFocused();
  await expect(page).toHaveURL(/#crowd$/);
});
