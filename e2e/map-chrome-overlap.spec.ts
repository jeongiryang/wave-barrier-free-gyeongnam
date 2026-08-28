import { expect, test } from "@playwright/test";
import { mockPlannerApi } from "./fixtures";

/**
 * Kakao 지도 연결이 실패하면 배지에 "Kakao 재연결" 버튼이 붙는다. 지도 명령 바가
 * 배지 자리를 충분히 비우지 않으면 이 버튼의 오른쪽이 명령 바 첫 버튼에 덮이고,
 * 그 자리를 누르면 지도 유형이 대신 바뀐다. 복구 수단이 가장 필요한 순간에
 * 눌리지 않는 셈이므로, 어느 폭에서도 겹치지 않아야 한다.
 */
const WIDTHS = [1920, 1440, 1200, 1024, 960, 820, 768];

test("대체 지도 재연결 버튼을 지도 명령 바가 덮지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/planner");
    await page.locator("nav.map-command-bar").scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Kakao 재연결" })).toBeVisible();
    await page.waitForTimeout(900);

    const result = await page.evaluate(() => {
      const badge = document.querySelector(".map-provider-badge") as HTMLElement;
      const retry = badge.querySelector("button") as HTMLElement;
      const nav = document.querySelector("nav.map-command-bar") as HTMLElement;
      const rb = badge.getBoundingClientRect();
      const rn = nav.getBoundingClientRect();
      const overlapArea =
        Math.max(0, Math.min(rb.right, rn.right) - Math.max(rb.left, rn.left)) *
        Math.max(0, Math.min(rb.bottom, rn.bottom) - Math.max(rb.top, rn.top));

      const rr = retry.getBoundingClientRect();
      const stolen: string[] = [];
      for (const fraction of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const hit = document.elementFromPoint(rr.left + rr.width * fraction, rr.top + rr.height / 2);
        if (hit && hit !== retry && !retry.contains(hit)) {
          stolen.push(`${Math.round(fraction * 100)}% → ${(hit.closest("button")?.textContent || hit.tagName).trim()}`);
        }
      }
      return { overlapArea: Math.round(overlapArea), stolen };
    });

    expect(result.overlapArea, `${width}px에서 배지와 명령 바가 겹친다`).toBe(0);
    expect(result.stolen, `${width}px에서 재연결 버튼의 클릭을 다른 요소가 가져간다`).toEqual([]);
  }
});
