import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { freshArrival, prepareStory, storyReady } from "./landing-contract";

for (const seenBefore of [false, true]) {
  test(`a legacy marker ${seenBefore} does not suppress the current accessible intro`, async ({ page }) => {
    await page.addInitScript(seen => {
      if (seen) sessionStorage.setItem("wave-intro-seen-v2", "1");
    }, seenBefore);
    await freshArrival(page);
    const scene = page.locator(".arrival-scene");
    await expect(scene).toHaveAttribute("open", "");
    await expect(scene.locator(".arrival-picture img").first()).toHaveAttribute("src", "/media/horizon/hero-coast.jpg");
    await expect(scene.locator(".arrival-word")).toContainText("WAVE");
    await expect(scene).toContainText("모두의 여행이 같은 출발선에 설 수 있도록");
    await expect(scene.getByRole("button", { name: "건너뛰기" })).toBeFocused();
    const action = page.locator(".landing-actions a");
    await page.clock.runFor(8200);
    await expect(scene.locator("p")).toHaveText("WAVE가 당신의 발걸음을 응원합니다");
    await expect(scene.locator("p")).toHaveCSS("opacity", "1");
    await page.clock.runFor(2200);
    await expect(scene).toBeHidden();
    await action.focus(); await expect(action).toBeFocused();
    expect(await page.evaluate(() => sessionStorage.getItem("wave-arrival-session-v1"))).toBe("done");
  });
}

test("archived product recordings preserve their original bytes and dates without downloading on the current landing", async ({ page }) => {
  await prepareStory(page);
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.goto("/"); await storyReady(page);
  for (const id of ["story", "naru"]) await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  expect(requests.filter(url => /timeline-|date-before|date-after|map-two-desktop|places-two/.test(url))).toEqual([]);
  // The old recordings remain historical evidence, not fabricated current UI.
  const manifest = JSON.parse(await readFile("public/media/wave-journey/manifest.json", "utf8"));
  for (const name of ["places-two.webp", "date-before.webp", "date-after.webp", "map-two-desktop.webp"]) {
    const record = manifest.records.find((item: { file: string }) => item.file === name);
    expect(record).toBeDefined();
    expect(createHash("sha256").update(await readFile(`public/media/wave-journey/${name}`)).digest("hex")).toBe(record.sha256);
  }
  const timeline = JSON.parse(await readFile("public/media/wave-journey/timeline-manifest.json", "utf8"));
  expect(timeline.recordingId).toBe("production-eab2442-20260909-064600");
  expect([timeline.day1, timeline.day2]).toEqual(["2026-09-09", "2026-09-10"]);
  const recordings = [
    ["timeline-before-itinerary", 441, 703, ["126117", "2758443"], [1, 2]],
    ["timeline-before-map", 948, 1253, ["126117", "2758443"], [1, 2]],
    ["timeline-after-day1-itinerary", 441, 400, ["126117"], [1]],
    ["timeline-after-day1-map", 948, 1254, ["126117"], [1]],
    ["timeline-after-day2-itinerary", 442, 400, ["2758443"], [1]],
    ["timeline-after-day2-map", 948, 1254, ["2758443"], [1]],
  ];
  expect(timeline.assets).toHaveLength(6);
  for (const [name, width, height, ids, ranks] of recordings) {
    const record = timeline.assets.find((item: { name: string }) => item.name === name);
    expect(record).toBeDefined();
    expect([record.width, record.height, record.placeIds, record.ranks]).toEqual([width, height, ids, ranks]);
    expect(createHash("sha256").update(await readFile(`public/media/wave-journey/${name}.webp`)).digest("hex")).toBe(record.sha256);
  }
});
