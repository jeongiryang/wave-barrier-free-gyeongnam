import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi, mockPublicShellApi } from "./fixtures";

test("travel condition controls stay inside their card before and after selection", async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/planner");
  const conditions = page.getByRole("group", { name: "여행 검색 조건", exact: true });
  for (const selected of [false, true]) {
    if (selected) await chooseTripConditions(page);
    for (const width of [320, 390, 960, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await conditions.scrollIntoViewIfNeeded();
      await expect.poll(() => conditions.evaluate(card => {
        const bounds = card.getBoundingClientRect();
        return [...card.querySelectorAll("button")].filter(button => {
          const box = button.getBoundingClientRect();
          return box.width < 44 || box.height < 44 || box.left < bounds.left || box.right > bounds.right + 1;
        }).map(button => button.textContent);
      }), { message: `${width}px ${selected ? "selected" : "initial"} conditions must fit their own card` }).toEqual([]);
    }
  }
});
