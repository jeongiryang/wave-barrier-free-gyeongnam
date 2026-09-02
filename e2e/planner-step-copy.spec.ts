import { expect, test } from "@playwright/test";
import { mockPlannerApi, mockPublicShellApi } from "./fixtures";

/**
 * 조건 패널은 한 화면 안에서 번호를 두 번 매기고 있었고, 편의 조건을 고르기 전에는
 * 요약 문장이 "조건을개 선택"으로 끊겨 있었다. 두 가지 모두 눈으로 읽히는 문제라
 * 렌더링된 화면에서 확인한다.
 */

async function openPlanner(page: import("@playwright/test").Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPublicShellApi(page);
  await mockPlannerApi(page);
  await page.addInitScript(() => window.sessionStorage.setItem("wave-intro-seen-v2", "1"));
  await page.goto("/planner");
  await page.locator(".selection-bar").first().waitFor();
}

/**
 * 조건 카드는 서버가 그린 HTML에 이미 있어서, 하이드레이션 전에 누르면 아무 일도
 * 일어나지 않는다. 상태가 실제로 뒤집힐 때까지 다시 눌러 본다.
 */
async function toggleUntilPressed(card: import("@playwright/test").Locator, pressed: boolean) {
  await expect(async () => {
    if ((await card.getAttribute("aria-pressed")) === String(pressed)) return;
    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", String(pressed), { timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
}

test("조건 필드 라벨이 번호로 시작하지 않는다", async ({ page }) => {
  await openPlanner(page);
  const labels = await page.locator(".step-label").allInnerTexts();
  expect(labels.length).toBeGreaterThan(0);
  for (const label of labels) {
    expect(label.trim(), "섹션 STEP 번호와 겹치는 자체 번호").not.toMatch(/^\d/);
  }
});

test("편의 조건을 고르기 전후 모두 요약 문장이 완결된다", async ({ page }) => {
  await openPlanner(page);
  const summary = page.locator(".selection-bar p b").first();
  const cards = page.locator(".profile-card");
  // 카드를 인덱스로 하나씩 끈다. `[aria-pressed=true]` 목록은 클릭할 때마다 다시
  // 풀려서, 리렌더 전에 같은 카드를 두 번 눌러 도로 켜는 일이 생긴다.
  for (let index = 0; index < (await cards.count()); index += 1) {
    await toggleUntilPressed(cards.nth(index), false);
  }
  await expect(summary).toHaveText("선택한 편의 조건 없음");
  await expect(page.locator(".generate-button")).toHaveCount(0);
  await expect(page.getByText("편의 조건을 하나 이상 선택하면 추천을 시작합니다.")).toBeVisible();

  await toggleUntilPressed(cards.first(), true);
  await expect(summary).toHaveText(/^편의 조건 \d+개 선택$/);
  await expect(page.locator(".generate-button")).toHaveCount(0);
  await expect(page.getByText("조건을 바꾸면 추천이 자동으로 업데이트됩니다.")).toBeVisible();
});

test("단계 제목이 모두 한국어로 읽힌다", async ({ page }) => {
  await openPlanner(page);
  const headings = await page.locator(".journey-subheading h2").allInnerTexts();
  expect(headings.length).toBeGreaterThan(0);
  for (const heading of headings) {
    expect(heading.trim(), "한글이 한 글자도 없는 제목").toMatch(/[가-힣]/);
  }
  await expect(page.locator(".journey-subheading h2", { hasText: "여행 조건 정하기" })).toBeVisible();
  await expect(page.locator(".journey-subheading h2", { hasText: "여행지 고르기" })).toBeVisible();
  await expect(page.locator(".journey-subheading h2", { hasText: "이 기기 일정 만들기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "출발 전에 이것만 다시 확인하세요." })).toBeVisible();
});
