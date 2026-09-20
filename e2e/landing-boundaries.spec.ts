import { expect, test, type Page, type Response } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPlannerApi, mockPublicShellApi, plan } from "./fixtures";
import { allRegions, firstRegions, storyReady, expectUsableTarget, expectNoOverflow } from "./landing-contract";
import { findLowContrastText } from "./contrast";

const boundaryAsset = /RegionBoundarySurface|LandingBoundaryMap|korea-sgis|gyeongnam-boundar|\.geojson(?:\?|$)/i;

async function prepareRegions(page: Page) {
  await mockPlannerApi(page);
  await mockPublicShellApi(page);
  await page.route("**/api/wave?action=plan*", route => {
    const region = new URL(route.request().url()).searchParams.get("region")!;
    // Distinct synthetic results ensure an old region cannot satisfy selection.
    return route.fulfill({ json: {
      ...plan, criteria: { facilityKeys: [] }, stops: [], statuses: [],
      places: [{ ...plan.places[0], id: String(90000 + allRegions.indexOf(region)), city: region,
        name: `${region} 검증용 여행지`, address: `${region} 테스트 주소`, image: "", mapX: "", mapY: "" }],
    } });
  });
}

function regionResponse(page: Page, region: string) {
  return page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/wave" && url.searchParams.get("action") === "plan" && url.searchParams.get("region") === region;
  });
}

async function expectRegion(page: Page, region: string, response: Promise<Response>) {
  const result = await response;
  await result.finished();
  const query = new URL(result.url()).searchParams;
  expect(query.get("themes") || "").toBe("");
  expect(query.get("facilityKeys") || "").toBe("");
  await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue(region);
  await expect(page).toHaveURL(url => url.pathname === "/planner" && url.searchParams.get("region") === region);
  await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
  await expect(page.locator(".simple-results h3")).toHaveText(`${region} 검증용 여행지`);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values?.["wave-planner-region-v1"])).toBe(region);
}

async function expandedPlannerRegions(page: Page, en = false) {
  const select = page.getByRole("combobox", { name: "여행 지역", exact: true });
  await expect(select).toBeEnabled();
  await expect(select).toHaveValue("");
  const gallery = page.locator(".simple-region-discovery");
  await expect(gallery.locator(".simple-region h3")).toHaveText(firstRegions);
  const expand = gallery.getByRole("button", { name: en ? "All 18 regions" : "전체 18개 지역", exact: true });
  await expectUsableTarget(expand);
  await expect(expand).toHaveAttribute("aria-controls", "planner-region-options");
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  await expand.press("Space");
  await expect(gallery.locator(".simple-region")).toHaveCount(18);
  await expect(expand).toHaveCount(0);
  await expect(gallery.getByRole("button", { name: en ? "Show fewer" : "접기", exact: true })).toBeFocused();
  return { gallery, select };
}

test.beforeEach(async ({ page }) => { await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done")); });

for (const width of [390, 1366]) test(`regional entry: all 18 gallery choices and native IDs remain keyboard usable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepareRegions(page);
  await page.goto("/planner");
  const { gallery, select } = await expandedPlannerRegions(page);
  expect((await gallery.locator("h3").allTextContents()).sort()).toEqual([...allRegions].sort());
  const values = await select.locator("option").evaluateAll(nodes => nodes.map(node => (node as HTMLOptionElement).value));
  expect(values.filter(value => value && value !== "경남 전체").sort()).toEqual([...allRegions].sort());
  expect(values.filter(value => value === "경남 전체")).toHaveLength(1);
  for (const name of allRegions) {
    const button = gallery.getByRole("button", { name: `${name} 지역 선택`, exact: true });
    await expectUsableTarget(button);
    await expect(button).toHaveAttribute("aria-pressed", "false");
    await expect(button).toHaveAttribute("lang", "ko");
  }
  expect((await new AxeBuilder({ page }).include(".simple-search-controls").analyze()).violations).toEqual([]);
  expect(await gallery.evaluate(node => node.getAnimations({ subtree: true }).filter(animation => animation.playState === "running").length)).toBe(0);
  await expectNoOverflow(page);
  await gallery.screenshot({ path: test.info().outputPath(`region-gallery-${width}.png`) });
  const first = gallery.getByRole("button", { name: "통영 지역 선택", exact: true });
  const chosen = regionResponse(page, "통영");
  await first.focus(); await first.press("Enter");
  await expectRegion(page, "통영", chosen);
  // The native selector remains after the entry gallery gives way to results.
  for (const name of allRegions.filter(name => name !== "통영")) {
    const response = regionResponse(page, name);
    await select.focus(); await select.selectOption(name);
    await expectRegion(page, name, response);
    await expect(select).toBeFocused();
  }
  await expectNoOverflow(page);
});

for (const theme of ["light", "dark"] as const) test(`regional entry: English preference preserves Korean canonical choices and readable ${theme} controls`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(value => { localStorage.setItem("wave-locale", "en"); localStorage.setItem("wave-theme", value); }, theme);
  await prepareRegions(page);
  await page.goto("/planner");
  const { gallery, select } = await expandedPlannerRegions(page, true);
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  expect((await gallery.locator("h3").allTextContents()).sort()).toEqual([...allRegions].sort());
  expect(await select.evaluate(node => node.closest("[lang]")?.getAttribute("lang"))).toBe("ko");
  for (const name of allRegions) await expect(gallery.getByRole("button", { name: `${name} 지역 선택`, exact: true })).toHaveAttribute("lang", "ko");
  expect(await gallery.locator("h3").evaluateAll(nodes => nodes.every(node => node.scrollWidth <= node.clientWidth + 1))).toBe(true);
  expect((await new AxeBuilder({ page }).include(".simple-search-controls").analyze()).violations).toEqual([]);
  expect((await findLowContrastText(page)).filter(item => /simple-region|simple-search/.test(item.where))).toEqual([]);
  await expectNoOverflow(page);
  await gallery.screenshot({ path: test.info().outputPath(`region-controls-en-${theme}.png`) });
  const chosen = regionResponse(page, "통영");
  await gallery.getByRole("button", { name: "통영 지역 선택", exact: true }).click();
  await expectRegion(page, "통영", chosen);
  await expect(page.locator(".simple-results h2")).toHaveText("통영 places");
});

test("regional entry: both screens avoid boundary downloads and no-JS explicitly requires scripts", async ({ page, browser }) => {
  await prepareRegions(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.route(boundaryAsset, route => route.abort());
  await page.goto("/", { waitUntil: "domcontentloaded" }); await storyReady(page);
  await page.getByRole("button", { name: "18개 지역 모두 보기", exact: true }).click();
  await expect(page.locator("#regions .simple-region")).toHaveCount(18);
  await page.locator("#story").scrollIntoViewIfNeeded();
  await expect(page.locator("#story [data-region-boundary]")).toHaveCount(18);
  expect(requests.filter(url => boundaryAsset.test(url))).toEqual([]);
  const plannerLink = page.locator('.wave-header nav a[href="/planner"]');
  await plannerLink.focus();
  await Promise.all([
    page.waitForURL(url => url.pathname === "/planner", { waitUntil: "domcontentloaded" }),
    plannerLink.press("Enter"),
  ]);
  await expect(page).toHaveURL(url => url.pathname === "/planner");
  const { gallery } = await expandedPlannerRegions(page);
  const chosen = regionResponse(page, "김해");
  await gallery.getByRole("button", { name: "김해 지역 선택", exact: true }).click();
  await expectRegion(page, "김해", chosen);
  await expect(page.locator("[data-region-boundary]")).toHaveCount(18);
  expect(requests.filter(url => boundaryAsset.test(url))).toEqual([]);

  const context = await browser.newContext({ javaScriptEnabled: false, viewport: page.viewportSize()! });
  try {
    await context.route("**/*", route => route.request().resourceType() === "image" ? route.abort() : route.continue());
    const staticPage = await context.newPage();
    const origin = new URL(page.url()).origin;
    await staticPage.goto(origin + "/", { waitUntil: "domcontentloaded" });
    await expect(staticPage.locator("noscript p")).toBeVisible();
    await expect(staticPage.locator("noscript p")).toContainText("JavaScript를 허용해 주세요");
    const links = staticPage.locator("#regions .simple-region-link");
    await expect(links).toHaveCount(6);
    // The framework's streamed client subtree is hidden without JavaScript.
    // Its safe markup URLs are not a supported no-script region picker.
    for (const [index, name] of firstRegions.entries()) {
      const link = links.nth(index), target = new URL((await link.getAttribute("href"))!, origin);
      expect(target.origin).toBe(origin); expect(target.pathname).toBe("/planner");
      expect([...target.searchParams]).toEqual([["region", name]]);
      await expect(link).toHaveAttribute("aria-label", `${name} 여행지 보기`);
      await expect(link).toBeHidden();
      await expect(staticPage.getByRole("link", { name: `${name} 여행지 보기`, exact: true })).toHaveCount(0);
    }
    await expect(staticPage.locator("#regions .simple-show-regions")).toBeDisabled();
    await expect(staticPage.getByRole("button", { name: "18개 지역 모두 보기", exact: true })).toHaveCount(0);
    await staticPage.screenshot({ path: test.info().outputPath("no-script-requirement.png") });
  } finally { await context.close(); }
});

test("regional entry: failed images leave every named gallery choice and the native selector usable", async ({ page }) => {
  await prepareRegions(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/*", route => route.request().resourceType() === "image" ? route.abort() : route.fallback());
  await page.goto("/planner");
  const { gallery, select } = await expandedPlannerRegions(page);
  for (const name of allRegions) {
    const button = gallery.getByRole("button", { name: `${name} 지역 선택`, exact: true });
    await expectUsableTarget(button);
    await expect(button.locator("h3")).toHaveText(name);
    await expect.poll(() => button.locator("img").evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth === 0)).toBe(true);
    await expect(button.locator("img")).toBeHidden();
  }
  expect((await new AxeBuilder({ page }).include(".simple-search-controls").analyze()).violations).toEqual([]);
  const chosen = regionResponse(page, "통영");
  await gallery.getByRole("button", { name: "통영 지역 선택", exact: true }).click();
  await expectRegion(page, "통영", chosen);
  for (const name of ["거창", "김해"]) {
    const response = regionResponse(page, name);
    await select.selectOption(name);
    await expectRegion(page, name, response);
  }
  await expectNoOverflow(page);
});

test("regional entry: pointer hover stays stable and coastal or inland choices match the requested region", async ({ page }) => {
  await prepareRegions(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const searches: string[] = [];
  page.on("request", request => { const url = new URL(request.url()); if (url.pathname === "/api/wave" && url.searchParams.get("action") === "plan") searches.push(url.searchParams.get("region")!); });
  await page.goto("/planner");
  const { gallery, select } = await expandedPlannerRegions(page);
  for (const name of ["거제", "진주", "김해"]) {
    const button = gallery.getByRole("button", { name: `${name} 지역 선택`, exact: true });
    await button.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
    const before = (await button.boundingBox())!;
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    expect(Math.abs((await button.boundingBox())!.y - before.y), "hover must not scroll the target away").toBeLessThanOrEqual(1);
    await expect(select).toHaveValue("");
    expect(searches).toEqual([]);
  }
  const coastal = gallery.getByRole("button", { name: "거제 지역 선택", exact: true });
  await coastal.evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
  const box = (await coastal.boundingBox())!, chosen = regionResponse(page, "거제");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expectRegion(page, "거제", chosen);
  for (const name of ["진주", "김해"]) {
    const response = regionResponse(page, name);
    await select.selectOption(name);
    await expectRegion(page, name, response);
  }
  expect(searches).toEqual(["거제", "진주", "김해"]);
});
