import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

/**
 * "조작 대상은 최소 44px"은 이 저장소가 스스로 정한 규칙이다(CLAUDE.md).
 * 규칙이 CSS에 적혀 있는 것만으로는 지켜졌다고 할 수 없다. 나중에 로드되는
 * 파일이 같은 대상에 더 작은 min-height를 다시 적으면 조용히 덮인다.
 *
 * 그래서 계산된 스타일이 아니라 **실제로 눌리는 영역**을 잰다. `elementFromPoint`로
 * 중심에서 바깥으로 넓혀 가며, 시각 크기를 키우지 않고 `::after`로 넓힌 영역까지
 * 함께 센다.
 */

const CONTRACT: Array<{ path: string; selector: string; name: string }> = [
  { path: "/", selector: ".account-button", name: "계정" },
  { path: "/", selector: ".help-button", name: "도움말" },
  { path: "/planner", selector: ".tool-launch-status button", name: "자세히 보기" },
  { path: "/planner", selector: ".map-provider-badge button", name: "지도 제공자 재연결" },
  { path: "/planner", selector: ".map-command-bar button", name: "지도 도구" },
  { path: "/planner", selector: ".map-type-switch button", name: "지도 종류" },
  { path: "/community", selector: ".account-button", name: "계정(커뮤니티)" },
  { path: "/community", selector: ".help-button", name: "도움말(커뮤니티)" },
  { path: "/travel-book", selector: ".help-button", name: "도움말(여행집)" },
];

/** 중심에서 바깥으로 넓히며 실제 클릭 판정이 유지되는 범위를 잰다. */
async function hitArea(locator: import("@playwright/test").Locator) {
  await locator.scrollIntoViewIfNeeded();
  return locator.evaluate((el: HTMLElement) => {
    const box = el.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const hits = (x: number, y: number) => {
      const found = document.elementFromPoint(x, y);
      return !!found && (found === el || el.contains(found));
    };
    if (!hits(cx, cy)) return { width: 0, height: 0, covered: true };
    const grow = (dx: number, dy: number) => {
      let step = 0;
      while (step < 60 && hits(cx + dx * (step + 1), cy + dy * (step + 1))) step += 1;
      return step;
    };
    return {
      width: grow(-1, 0) + grow(1, 0) + 1,
      height: grow(0, -1) + grow(0, 1) + 1,
      covered: false,
    };
  });
}

for (const width of [1440, 390]) {
  test(`${width}px에서 조작 대상이 44px 이상 눌린다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const failures: string[] = [];
    let checked = 0;

    for (const path of [...new Set(CONTRACT.map((item) => item.path))]) {
      await mockPublicShellApi(page);
      await mockPlannerApi(page);
      await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
      await page.goto(path);
      await page.waitForTimeout(2_000);

      for (const target of CONTRACT.filter((item) => item.path === path)) {
        const locator = page.locator(target.selector).first();
        // 화면 폭에 따라 숨는 조작 대상이 있다. 있는 것만 잰다.
        if (!(await locator.count()) || !(await locator.isVisible())) continue;
        checked += 1;
        const area = await hitArea(locator);
        if (area.covered) {
          failures.push(`${target.name}: 다른 요소에 덮여 중심조차 눌리지 않는다`);
        } else if (area.height < 44 || area.width < 44) {
          failures.push(`${target.name}(${target.selector}): 눌리는 영역 ${area.width}x${area.height}`);
        }
      }
    }

    expect(checked, "잰 조작 대상이 하나도 없다").toBeGreaterThan(3);
    expect(failures, "44px 계약을 지키지 않는 조작 대상").toEqual([]);
  });
}
