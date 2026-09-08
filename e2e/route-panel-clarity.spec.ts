import { expect, test } from "@playwright/test";
import { mockPlannerApi, chooseTripConditions } from "./fixtures";

/**
 * 길찾기 결과 패널은 같은 말을 여러 번 적고, 값이 들어갈 자리에 안내문을 넣고
 * 있었다. 정보를 줄이지 않으면서 한 번에 읽히게 한다.
 */
test("이동수단 카드의 시간 자리에 안내문을 값처럼 넣지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner", { waitUntil: "domcontentloaded" });
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.waitForTimeout(2_200);

  const values = await page.evaluate(() =>
    [...document.querySelectorAll(".route-mode-sections button > strong")]
      .map((node) => (node.textContent || "").trim()));

  expect(values.length, "이동수단 카드를 찾지 못했다").toBeGreaterThan(0);
  for (const value of values) {
    // "카카오 확인"은 값이 아니라 다음 행동 안내다. 시간 자리에 두면 예상 시간으로 읽힌다.
    expect(value, `시간 자리에 안내문이 들어 있다: "${value}"`).not.toContain("카카오");
    expect(value === "" || /분$/.test(value) || value === "시간 정보 없음", `시간 자리 값이 뜻밖이다: "${value}"`).toBe(true);
  }
});

test("경로 카드가 같은 이름을 반복하지 않는다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner", { waitUntil: "domcontentloaded" });
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.waitForTimeout(2_200);

  const cards = await page.evaluate(() =>
    [...document.querySelectorAll(".route-option")].map((node) => ({
      title: (node.querySelector("strong")?.textContent || "").trim(),
      text: (node.textContent || "").replace(/\s+/g, " ").trim(),
    })));

  expect(cards.length, "경로 카드를 찾지 못했다").toBeGreaterThan(0);
  for (const card of cards) {
    const occurrences = card.text.split(card.title).length - 1;
    expect(occurrences, `"${card.title}"이 카드 안에서 ${occurrences}번 반복된다`).toBe(1);
  }
});

test("경로 카드는 예상 시간·요금·환승·도보를 그대로 보여 준다", async ({ page }) => {
  // 단순화가 정보 삭제가 되면 안 된다.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockPlannerApi(page);
  await page.goto("/planner", { waitUntil: "domcontentloaded" });
  await chooseTripConditions(page);
  await page.getByRole("button", { name: "경남도립미술관 일정에 추가", exact: true }).click();
  await page.waitForTimeout(2_200);

  const first = page.locator(".route-option").first();
  for (const label of ["예상 시간", "통행료", "환승", "도보"]) {
    await expect(first.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(first.getByText("25분")).toBeVisible();
  await expect(first.getByText("통행료 없음", { exact: true })).toBeVisible();
});
