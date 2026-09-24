import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { prepareStory, storyReady } from "./landing-contract";

test("brand meaning is explained without replacing the Korean service promise", async ({ page }) => {
  await prepareStory(page);
  await page.goto("/");
  await storyReady(page);

  const hero = page.locator("#top");
  await expect(hero.getByRole("heading", { level: 1 })).toHaveText("더 넓은 세상을함께, WAVE");
  await expect(hero.locator(".landing-hero-description")).toHaveText("장벽은 낮게, 더 많은 여행이 가능하게.경남의 새로운 여행을 경험하세요.");
  await expect(hero.getByRole("link", { name: "여행지 둘러보기" })).toBeVisible();
  await expect(hero).not.toContainText("Way for All, Voyage for Everyone");

  await expect(page.locator("#closing")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).include("#top").analyze()).violations).toEqual([]);
});

test("guide explains the same brand meaning once", async ({ page }) => {
  await page.goto("/guide");
  const meaning = page.locator(".guide-brand");
  await expect(meaning).toContainText("모두를 위한 길, 모두를 위한 여행");
  await expect(meaning.locator('[lang="en"]')).toHaveText("Way for All, Voyage for Everyone");
});
