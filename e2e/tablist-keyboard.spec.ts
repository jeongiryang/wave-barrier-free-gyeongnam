import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

/**
 * `role="tablist"`은 보조기술에 "탭 1/8"이라고 알리고, 사용자는 화살표로 옮겨
 * 다닐 수 있다고 기대한다. 역할만 붙고 키 처리가 없으면 안내받은 조작이 통하지
 * 않는다. 실제로 키를 눌러 확인한다.
 */

const TABS = ".layer-tabs [role=tab]";

async function openPlanner(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/planner");
  // 테마 탭은 접힌 ‘주변 여행 정보’ 안에 있고, 열어야 그때 불러온다. 펼치는 것은
  // React 상태라 하이드레이션 전에 누르면 <details>만 열리고 내용은 오지 않는다.
  const summary = page.locator("details.planner-secondary-details summary");
  await expect(async () => {
    if (await page.locator(".layer-tabs").count()) return;
    await summary.click();
    await expect(page.locator(".layer-tabs")).toHaveCount(1, { timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
}

test("테마 탭을 화살표와 Home·End로 옮긴다", async ({ page }) => {
  await openPlanner(page);
  const ids = await page.locator(TABS).evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(ids.length).toBeGreaterThan(1);
  // 초점을 확인하려면 탭마다 id가 있어야 한다. 없으면 패널과 연결할 수도 없다.
  expect(ids.filter(Boolean), "탭에 id가 없다").toHaveLength(ids.length);
  const last = ids.length - 1;

  /** 선택과 초점은 함께 움직여야 한다. 초점이 남으면 다음 화살표가 옛 위치에서 센다. */
  async function expectAt(index: number, because: string) {
    await expect(page.locator(`#${ids[index]}`), because).toHaveAttribute("aria-selected", "true");
    await expect.poll(() => page.evaluate(() => document.activeElement?.id), { message: because }).toBe(ids[index]);
  }

  // 키보드 사용자는 Tab으로 선택된 탭에 닿는다. 거기서부터 화살표가 표준이다.
  const start = page.locator(`${TABS}[aria-selected=true]`);
  const startIndex = ids.indexOf((await start.getAttribute("id")) ?? "");
  await start.focus();

  await page.keyboard.press("ArrowRight");
  await expectAt((startIndex + 1) % ids.length, "ArrowRight가 아무 일도 하지 않는다");

  await page.keyboard.press("ArrowLeft");
  await expectAt(startIndex, "ArrowLeft가 되돌아오지 않는다");

  await page.keyboard.press("End");
  await expectAt(last, "End가 마지막 탭으로 가지 않는다");

  await page.keyboard.press("Home");
  await expectAt(0, "Home이 첫 탭으로 가지 않는다");

  // 끝에서 반대편으로 감는다. 목록이 끝났다고 초점을 잃으면 위치를 놓친다.
  await page.keyboard.press("ArrowLeft");
  await expectAt(last, "첫 탭에서 ArrowLeft가 마지막으로 감기지 않는다");
});

test("탭 목록은 Tab 순서를 한 칸만 차지한다", async ({ page }) => {
  await openPlanner(page);
  const stops = await page.locator(TABS).evaluateAll((nodes) =>
    nodes.filter((node) => (node as HTMLElement).tabIndex !== -1).length);
  expect(stops, "탭 하나하나가 Tab 정지점이면 다음 요소까지 여러 번 눌러야 한다").toBe(1);
});

test("탭이 여는 패널이 실제로 존재하고 서로를 가리킨다", async ({ page }) => {
  await openPlanner(page);
  const lists = await page.evaluate(() => [...document.querySelectorAll('[role="tablist"]')].map((list) => {
    const tabs = [...list.querySelectorAll('[role="tab"]')] as HTMLElement[];
    const selected = tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
    const panelId = selected?.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    return {
      label: list.getAttribute("aria-label"),
      everyTabControlsPanel: tabs.every((tab) => !!tab.getAttribute("aria-controls")),
      panelRole: panel?.getAttribute("role") ?? null,
      panelPointsBack: panel?.getAttribute("aria-labelledby") === selected?.id,
    };
  }));
  expect(lists.length, "확인할 탭 목록이 없다").toBeGreaterThan(0);
  for (const list of lists) {
    expect(list.everyTabControlsPanel, `${list.label}: 탭이 여는 대상이 없다`).toBe(true);
    expect(list.panelRole, `${list.label}: 가리킨 패널이 없다`).toBe("tabpanel");
    expect(list.panelPointsBack, `${list.label}: 패널이 탭을 되가리키지 않는다`).toBe(true);
  }
});

test("탭처럼 굴지 않는 선택 묶음은 탭이라고 말하지 않는다", async ({ page }) => {
  await openPlanner(page);
  // 교통수단 필터는 예매 안내·운행정보·경로 목록 세 곳을 함께 바꿔 가리킬 패널이 없고,
  // 이동수단 요약은 예상 시간이 오면 다시 정렬돼 화살표로 갈 "옆 탭"이 없다.
  for (const selector of [".transport-mode-filter", ".route-mode-sections"]) {
    const group = page.locator(selector);
    await expect(group, selector).toHaveAttribute("role", "group");
    expect(await group.locator("[role=tab]").count(), `${selector}에 탭 역할이 남아 있다`).toBe(0);
    // 색만으로 상태를 말하지 않도록 누른 상태가 보조기술에 전달돼야 한다.
    await expect(group.locator("button[aria-pressed=true]"), selector).toHaveCount(1);
  }
});
