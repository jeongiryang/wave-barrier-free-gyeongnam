import { expect, test } from "@playwright/test";
import { chooseTripConditions, mockPlannerApi } from "./fixtures";

declare global { interface Window { waveStageScrolls: Array<{ id: string; behavior: string }>; } }

for (const view of ["overview", "guided"] as const) for (const motion of ["reduce", "no-preference"] as const) {
  test(`${view} ${motion}: nonadjacent stage jumps agree with the visible section and keyboard focus`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: view });
    await page.emulateMedia({ reducedMotion: motion });
    await page.addInitScript(() => {
      window.waveStageScrolls = [];
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = function (options) {
        window.waveStageScrolls.push({ id: this.id, behavior: typeof options === "object" ? options.behavior || "auto" : "auto" });
        return original.call(this, options);
      };
    });
    await page.goto("/planner");
    await chooseTripConditions(page);
    await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
    const rail = page.getByRole("navigation", { name: "여행 만들기 단계" });
    for (const width of [page.viewportSize()!.width, 960]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [id, label] of [["conditions", "1. 지역"], ["departure-readiness", "7. 전체보기"], ["itinerary", "6. 일정"], ["places", "4. 여행지"], ["departure-readiness", "7. 전체보기"], ["conditions", "1. 지역"]]) {
        const control = rail.getByRole("button", { name: new RegExp(`^${label}`) });
        await page.evaluate(() => { window.waveStageScrolls = []; });
        await control.click();
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
        const heading = page.locator(`#${id}`).locator("h2, h3").first();
        await expect(heading).toBeFocused();
        await expect.poll(async () => {
          const position = await heading.evaluate(element => ({ top: element.getBoundingClientRect().top, height: innerHeight }));
          return position.top >= 0 && position.top < position.height / 2 && await control.getAttribute("aria-current") === "step";
        }, { message: `${id} must remain the current visible destination` }).toBe(true);
        const behaviors = await page.evaluate(id => window.waveStageScrolls.filter(call => call.id === id).map(call => call.behavior), id);
        expect(behaviors.length).toBeGreaterThan(0);
        expect(behaviors.every(behavior => behavior === (motion === "reduce" ? "auto" : "smooth"))).toBe(true);
        if (view === "overview" && id === "itinerary") await page.screenshot({ path: test.info().outputPath(`stage-itinerary-${width}.png`) });
      }
    }
  });
}
