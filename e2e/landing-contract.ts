import { expect, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mockPublicShellApi } from "./fixtures";

/** Post-arrival only. First-entry suites exercise the real Intro and dismissal. */
export async function prepareStory(page: Page) {
  await mockPublicShellApi(page);
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
  const bitmap = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://tong.visitkorea.or.kr/**", route => route.fulfill({ contentType: "image/webp", body: bitmap }));
}

export async function storyReady(page: Page) {
  await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
  await expect(page.locator(".landing-page")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

export async function expectUsableTarget(target: Locator) {
  await target.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
  await target.focus();
  await expect(target).toBeFocused();
  const box = await target.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(await target.evaluate(node => {
    const r = node.getBoundingClientRect();
    return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
  })).toBe(true);
}

export const chapterIds = ["top", "regions", "story", "recommendation", "departure", "community", "closing"];
export const chapterNames = {
  ko: ["처음", "경남", "여행 준비", "함께 여행", "출발 전", "여행 이야기", "여행 계획"],
  en: ["Welcome", "Gyeongnam", "How it works", "Together", "Before leaving", "Community", "Plan a trip"],
};
