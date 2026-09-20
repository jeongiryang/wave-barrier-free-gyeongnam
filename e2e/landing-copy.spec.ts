import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { prepareStory, storyReady } from "./landing-contract";

test("brand meaning is explained without replacing the Korean service promise", async ({ page }) => {
  await prepareStory(page);
  await page.goto("/");
  await storyReady(page);

  const hero = page.locator("#top");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("경남 여행, 갈 수 있는지부터 확인하고 계획해요");
  await expect(hero.locator(".landing-hero-description")).toHaveText("공공데이터로 확인된 편의 정보를 함께 보여 줘요. 확인되지 않은 것은 확인되지 않았다고 알려 줘요.");
  await expect(hero.getByRole("link", { name: "여행 설계 시작하기" })).toBeVisible();
  await expect(hero).not.toContainText("Way for All, Voyage for Everyone");

  const meaning = page.locator("#closing .brand-meaning");
  await expect(meaning).toContainText("모두를 위한 길, 모두를 위한 여행");
  await expect(meaning.locator('[lang="en"]')).toHaveText("Way for All, Voyage for Everyone");
  expect((await new AxeBuilder({ page }).include("#top").include("#closing").analyze()).violations).toEqual([]);
});

test("guide explains the same brand meaning once", async ({ page }) => {
  await page.goto("/guide");
  const meaning = page.locator(".guide-brand");
  await expect(meaning).toContainText("모두를 위한 길, 모두를 위한 여행");
  await expect(meaning.locator('[lang="en"]')).toHaveText("Way for All, Voyage for Everyone");
});
