import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { chooseTripConditions, mockPlannerApi, plan } from "./fixtures";

async function prepare(page: Page, en = false) {
  await mockPlannerApi(page, { plannerView: "overview" });
  await page.addInitScript(value => localStorage.setItem("wave-locale", value ? "en" : "ko"), en);
  const image = await readFile("public/media/wave-story/hero-coast-small.webp");
  await page.route("https://wave.test/museum.svg", route => route.fulfill({ contentType: "image/webp", body: image }));
  await page.route("**/api/community/posts?*", route => route.fulfill({ json: { posts: [] } }));
  await page.route("**/api/wave?action=plan*", route => route.fulfill({ json: {
    ...plan, places: [{ ...plan.places[0], knownFields: 99, unknownFields: 98, negativeFields: 97,
      accessibility: [
        { key: "elevator", label: "승강기", state: "negative", detail: "승강기 없음" },
        { key: "restroom", label: "화장실", state: "unknown", detail: "" },
        { key: "route", label: "접근로", state: "confirmed", detail: "출입구까지 턱이 없음" },
      ],
    }],
  } }));
  await page.goto("/planner");
  if (!en) await chooseTripConditions(page);
  else {
    await expect(page.getByRole("button", { name: "Overview", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Changwon", exact: true }).click();
    await page.getByRole("button", { name: /Wheelchair facilities/ }).click();
    await page.getByRole("button", { name: /Nature and relaxation/ }).click();
    await page.getByRole("button", { name: "Find places →", exact: true }).click();
  }
  const trigger = page.locator(".place-card").first().getByRole("button", { name: en ? "Visitor information" : "이용 정보", exact: true });
  await trigger.click();
  await expect(page.getByRole("dialog").getByRole("heading", { level: 2 })).toBeFocused();
  return trigger;
}

for (const en of [false, true]) for (const theme of ["light", "dark"]) {
  test(`detail puts the trip action before grouped, unmodified evidence ${en ? "en" : "ko"} ${theme}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(value => localStorage.setItem("wave-theme", value), theme);
    const trigger = await prepare(page, en);
    const dialog = page.getByRole("dialog");
    const add = dialog.getByRole("button", { name: en ? "Add to itinerary" : "일정에 추가", exact: true });
    await expect(add).toBeEnabled();
    await expect(add).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button", { name: en ? "Close" : "닫기", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(add).toBeFocused();
    await expect(add).toBeInViewport();
    expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    await expect(dialog.locator(".evidence-counts")).toHaveText(en ? "Reported available 1Not reported 1Reported unavailable 1" : "확인됨 1미확인 1불일치 1");
    await expect(dialog.locator(".place-decision-summary h3")).toHaveText(en ? [
      "Facilities in the official record 1", "Facilities to check before visiting 1", "Facilities reported unavailable 1",
    ] : ["공식 기록에 있는 편의 1", "방문 전 확인할 편의 1", "제공되지 않는 것으로 기록된 편의 1"]);
    await expect(dialog.locator('.facility-evidence-list [data-state="confirmed"] dd')).toHaveText("출입구까지 턱이 없음");
    await expect(dialog.locator('.facility-evidence-list [data-state="unknown"] dd')).toHaveText(en ? "No information supplied. Please check with the venue." : "제공된 정보가 없습니다. 시설에 직접 확인해 주세요.");
    await expect(dialog.locator('.facility-evidence-list [data-state="negative"] dd')).toHaveText("승강기 없음");
    await expect(dialog.locator(".modal-visual > span")).toHaveAttribute("lang", "ko");
    await expect(dialog.locator(".modal-visual > span")).toHaveCSS("color", "rgb(18, 59, 75)");
    await expect(dialog.locator(".modal-close")).toHaveCSS("color", "rgb(18, 59, 75)");
    expect(await dialog.locator(".modal-body > button").evaluate(button => Boolean(button.compareDocumentPosition(document.querySelector(".place-decision-summary")!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`detail-${en ? "en" : "ko"}-${theme}.png`) });
    if (!en && theme === "light" && test.info().project.name === "desktop-chromium") {
      await page.setViewportSize({ width: 960, height: 960 });
      await add.focus();
      await expect(add).toBeInViewport();
      await page.screenshot({ path: test.info().outputPath("detail-960.png") });
    }
    expect(await dialog.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    await add.click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
    await trigger.click();
    const remove = dialog.getByRole("button", { name: en ? "Remove from itinerary" : "일정에서 빼기", exact: true });
    await expect(remove).toHaveAttribute("aria-pressed", "true");
    await remove.click();
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual([]);
    await trigger.click();
    await expect(add).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await page.getByRole("button", { name: en ? /Nature and relaxation/ : /자연·휴양 공원/ }).click();
    await trigger.click();
    await expect(add).toBeDisabled();
    await expect(dialog).toContainText(en ? "Search again if you changed your preferences" : "조건을 바꿨다면 여행지를 다시 찾아주세요");
    expect(errors).toEqual([]);
  });
}

test("a failed participation module leaves the primary trip action usable", async ({ page }) => {
  await page.route("**/features/planner/components/PlaceParticipationActions.tsx*", route => route.abort("failed"));
  await prepare(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toContainText("상세 화면을 불러오지 못했어요");
  await expect(dialog.locator('.facility-evidence-list [data-state="confirmed"] dd')).toHaveText("출입구까지 턱이 없음");
  await dialog.getByRole("button", { name: "일정에 추가", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-saved-places") || "[]"))).toEqual(["1001"]);
});
