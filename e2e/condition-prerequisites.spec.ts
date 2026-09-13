import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, plan } from "./fixtures";
import { prepareLandingMedia, storyReady, chapterIds } from "./landing-contract";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("wave-arrival-session-v1", "done"));
});

function deferred() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

async function currentTrip(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem("wave-current-trip-v1") || "{}").values || {};
    return {
      ids: JSON.parse(values["wave-saved-places"] || "[]"),
      schedule: JSON.parse(values["wave-trip-schedule-v1"] || "{}"),
      profiles: JSON.parse(sessionStorage.getItem("wave-session-facilities-v1") || "[]"),
    };
  });
}

for (const locale of ["ko", "en"] as const) {
  const en = locale === "en";
  test(`landing: ${locale} main planning copy stays fully painted across forward and return scrolling`, async ({ page }) => {
    await prepareLandingMedia(page);
    await page.addInitScript((value) => localStorage.setItem("wave-locale", value), locale);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await storyReady(page);
    const copy = page.locator(".landing-hero-copy");
    const planning = page.locator(".landing-actions a[href='/planner']");
    await expect(copy).toHaveCSS("opacity", "1");
    await page.locator(".simple-region-grid").scrollIntoViewIfNeeded();
    // Keep the primary message painted even outside the viewport: returning
    // to the CTA must not start a transparent-to-readable reveal again.
    const scrollPaint = await copy.evaluate(node => new Promise<string[]>(resolve => {
      const samples: string[] = [];
      const start = performance.now();
      function sample() {
        samples.push(getComputedStyle(node).opacity);
        if (performance.now() - start < 900) requestAnimationFrame(sample);
        else resolve(samples);
      }
      requestAnimationFrame(sample);
    }));
    expect(new Set(scrollPaint)).toEqual(new Set(["1"]));
    await expect(copy).toHaveCSS("opacity", "1");
    await planning.scrollIntoViewIfNeeded();
    await expect(copy).toHaveCSS("opacity", "1");
    await expect(planning).toBeVisible();
    expect((await new AxeBuilder({ page }).include(".landing-hero-copy").analyze()).violations).toEqual([]);
    await planning.click();
    await expect(page).toHaveURL(/\/planner/);
  });

  test(`${locale}: optional activities and dates do not gate the automatic regional search`, async ({ page }) => {
    await mockPlannerApi(page, { preserveView: true });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    const searches: URL[] = [];
    page.on("request", request => { if (request.url().includes("action=plan")) searches.push(new URL(request.url())); });
    await page.goto("/planner");
    const region = page.getByRole("combobox", { name: "여행 지역", exact: true });
    await expect(region).toBeEnabled();
    await expect(page.locator(".simple-region-entry .simple-region-link")).toHaveCount(6);
    expect(searches).toHaveLength(0);
    expect((await currentTrip(page)).profiles).toEqual([]);
    await region.selectOption("창원");
    await expect(page.locator(".simple-results")).toHaveAttribute("aria-busy", "false");
    const add = page.getByRole("button", { name: en ? "경남도립미술관 add to itinerary" : "경남도립미술관 일정에 담기", exact: true });
    await expect(add).toBeEnabled();
    expect(searches).toHaveLength(1);
    expect(searches[0].searchParams.get("themes")).toBe("");
    expect(searches[0].searchParams.get("facilityKeys")).toBe("");
    const activity = page.getByRole("group", { name: "하고 싶은 활동", exact: true }).getByRole("button").first();
    await activity.click();
    await expect.poll(() => searches.length).toBe(2);
    await expect(add).toBeEnabled();
    await expect(activity).toHaveAttribute("aria-pressed", "true");
    await activity.click();
    await expect.poll(() => searches.length).toBe(3);
    await expect(add).toBeEnabled();
    await expect(activity).toHaveAttribute("aria-pressed", "false");
    expect(searches[2].searchParams.get("themes")).toBe("");
    await expect(page.locator('.simple-browse-view input[type="date"]')).toHaveCount(0);
    expect((await new AxeBuilder({ page }).include("#conditions").analyze()).violations).toEqual([]);
    await add.click();
    await page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: /^내 일정/ }).click();
    const setup = page.locator(".simple-initial-setup");
    await setup.getByLabel("시작일", { exact: true }).fill("2026-09-20");
    await setup.getByLabel("마지막 날", { exact: true }).fill("2026-09-21");
    expect(searches).toHaveLength(3);
    expect((await currentTrip(page)).schedule).toMatchObject({ travelStart: "", travelEnd: "", scheduleAssignments: {} });
  });

  test(`${locale}: blank preferences browse places and supplied dates remain on the responsive map itinerary`, async ({ page }) => {
    await mockPlannerApi(page, { preserveView: true });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    const gate = deferred(), searches: URL[] = [];
    await page.route("**/api/wave?**", async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") !== "plan") return route.fallback();
      searches.push(url); await gate.promise; await route.fulfill({ json: plan });
    });
    try {
      await page.goto("/planner?travelStart=2026-09-20&travelEnd=2026-09-21");
      await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toBeEnabled();
      await expect(page.locator('.simple-activity-filter [aria-pressed="true"]')).toHaveCount(0);
      await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("");
      await expect(page.locator('.simple-region-entry [aria-pressed="true"]')).toHaveCount(0);
      expect((await currentTrip(page)).profiles).toEqual([]);
      await page.getByRole("button", { name: "경남 전체 둘러보기", exact: false }).click();
      await expect.poll(() => searches.length).toBe(1);
      expect(searches[0].searchParams.get("region")).toBe("경남 전체");
      expect(searches[0].searchParams.get("profiles")).toBe("");
      expect(searches[0].searchParams.get("locale")).toBe(locale);
      const results = page.locator("#places");
      await expect(results.locator(".simple-results")).toHaveAttribute("aria-busy", "true");
      await expect(page.locator(".simple-searching .button-loader")).toBeVisible();
      await expect(results.locator(".simple-place-skeleton")).toHaveCount(3);
      gate.release();
      await results.getByRole("button", { name: en ? "경남도립미술관 add to itinerary" : "경남도립미술관 일정에 담기", exact: true }).click();
      await expect(results).toBeVisible();
      await page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: /^내 일정/ }).click();
      const view = page.getByRole("group", { name: "일정 보기 방식", exact: true });
      const mobileLayout = (page.viewportSize()?.width || 1440) < 1024;
      await expect(page.locator(".simple-timeboard")).toContainText("경남도립미술관");
      if (mobileLayout) {
        await expect(view.getByRole("button", { name: "시간표", exact: true })).toHaveAttribute("aria-pressed", "true");
        await view.getByRole("button", { name: "지도", exact: true }).click();
      } else {
        await expect(view).toHaveCount(0);
        await expect(page.locator(".simple-timeboard")).toBeVisible();
      }
      await expect(page.locator('.simple-itinerary-board[data-map="true"]')).toBeVisible();
      await expect(page.locator(".simple-itinerary-map .leaflet-container")).toBeVisible();
      const selected = await currentTrip(page);
      expect(selected.ids).toEqual(["1001"]); expect(selected.profiles).toEqual([]);
      expect(selected.schedule).toMatchObject({ travelStart: "2026-09-20", travelEnd: "2026-09-21", scheduleAssignments: { "1001": "2026-09-20" } });
      if (mobileLayout) {
        await view.getByRole("button", { name: "시간표", exact: true }).click();
        await expect(page.locator(".simple-itinerary-map")).toHaveCount(0);
        await expect(page.locator(".simple-timeboard")).toBeVisible();
        await view.getByRole("button", { name: "지도", exact: true }).click();
        await expect(page.locator(".simple-itinerary-map .leaflet-container")).toBeVisible();
      }
      expect(await currentTrip(page)).toEqual(selected);
    } finally { gate.release(); }
  });

  test(`${locale}: an unfiltered failed search keeps its choices and can be retried into results`, async ({ page }) => {
    await mockPlannerApi(page, { preserveView: true });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    const searches: URL[] = [];
    await page.route("**/api/wave?**", route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") !== "plan") return route.fallback();
      searches.push(url);
      return searches.length === 1 ? route.fulfill({ status: 503, json: { error: "Synthetic provider outage" } }) : route.fulfill({ json: plan });
    });
    await page.goto("/planner?travelStart=2026-09-20&travelEnd=2026-09-21");
    await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "경남 전체 둘러보기", exact: false }).click();
    const results = page.locator("#places");
    await expect(results.getByRole("alert")).toBeVisible();
    await expect(results.locator(".simple-place-row")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toHaveValue("경남 전체");
    const before = await currentTrip(page);
    expect(before.profiles).toEqual([]);
    expect(before.schedule).toMatchObject({ travelStart: "2026-09-20", travelEnd: "2026-09-21" });
    await results.getByRole("button", { name: en ? "Retry with these preferences" : "같은 조건으로 다시 시도", exact: true }).click();
    await expect(results.getByRole("heading", { name: "경남도립미술관", exact: true })).toBeVisible();
    expect(searches).toHaveLength(2);
    expect(searches[1].search).toBe(searches[0].search);
    expect(await currentTrip(page)).toEqual(before);
  });

  test(`${locale}: empty unfiltered results offer a working retry without inventing saved places`, async ({ page }) => {
    await mockPlannerApi(page, { preserveView: true });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    const searches: URL[] = [];
    await page.route("**/api/wave?**", route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") !== "plan") return route.fallback();
      searches.push(url);
      return route.fulfill({ json: searches.length === 1 ? { ...plan, places: [], stops: [], statuses: plan.statuses.map(status => ({ ...status, count: 0 })) } : plan });
    });
    await page.goto("/planner?travelStart=2026-09-20&travelEnd=2026-09-21");
    await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "경남 전체 둘러보기", exact: false }).click();
    const results = page.locator("#places");
    await expect(results.getByText(en ? "No places were returned for these preferences." : "이 조건으로 불러온 장소가 없어요.", { exact: true })).toBeVisible();
    await expect(page.getByRole("group", { name: "여행 설계 화면", exact: true }).getByRole("button", { name: /^내 일정/ })).toBeDisabled();
    const before = await currentTrip(page);
    expect(before.ids).toEqual([]); expect(before.profiles).toEqual([]);
    await results.getByRole("button", { name: en ? "Retry with these preferences" : "같은 조건으로 다시 시도", exact: true }).click();
    await expect.poll(() => searches.length).toBe(2);
    await expect(results.getByRole("heading", { name: "경남도립미술관", exact: true })).toBeVisible();
    expect(searches).toHaveLength(2);
    expect(searches[1].search).toBe(searches[0].search);
    expect(await currentTrip(page)).toEqual(before);
  });

  test(`${locale}: automatic refresh keeps visible results and required facilities but blocks stale additions`, async ({ page }) => {
    await mockPlannerApi(page, { preserveView: true });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    const gate = deferred(), searches: URL[] = [];
    await page.route("**/api/wave?**", async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") !== "plan") return route.fallback();
      searches.push(url); if (searches.length === 2) await gate.promise;
      await route.fulfill({ json: plan });
    });
    try {
      await page.goto("/planner?travelStart=2026-09-20&travelEnd=2026-09-21");
      await expect(page.getByRole("combobox", { name: "여행 지역", exact: true })).toBeEnabled();
      await page.getByRole("button", { name: "필요한 편의", exact: false }).click();
      const picker = page.getByRole("dialog", { name: "필요한 편의", exact: true });
      await picker.getByRole("checkbox", { name: "접근로", exact: true }).check();
      await picker.getByRole("button", { name: /^적용/ }).click();
      await page.getByRole("combobox", { name: "여행 지역", exact: true }).selectOption("창원");
      const results = page.locator("#places");
      const museumName = en ? "경남도립미술관 add to itinerary" : "경남도립미술관 일정에 담기";
      const lakeName = en ? "용지호수공원 add to itinerary" : "용지호수공원 일정에 담기";
      await results.getByRole("button", { name: museumName, exact: true }).click();
      const before = await currentTrip(page);
      expect(before.ids).toEqual(["1001"]); expect(before.profiles).toEqual(["route"]);
      await page.getByRole("group", { name: "하고 싶은 활동", exact: true }).getByRole("button").first().click();
      await expect.poll(() => searches.length).toBe(2);
      expect(searches.map(url => url.searchParams.get("facilityKeys"))).toEqual(["route", "route"]);
      await expect(results).toBeVisible();
      await expect(results.locator(".simple-results")).toHaveAttribute("aria-busy", "true");
      await expect(results.getByRole("button", { name: lakeName, exact: true })).toBeDisabled();
      await expect(results.getByRole("button", { name: en ? "경남도립미술관 added · remove from itinerary" : "경남도립미술관 담았음 · 일정에서 빼기", exact: true })).toBeEnabled();
      await expect(results.locator('.simple-place-row[data-result-current="false"]')).toHaveCount(2);
      expect(await currentTrip(page)).toEqual(before);
      gate.release();
      await expect(results.getByRole("button", { name: lakeName, exact: true })).toBeEnabled();
      await expect(results.locator('.simple-place-row[data-result-current="true"]')).toHaveCount(2);
      await expect(results).toBeVisible();
      expect(await currentTrip(page)).toEqual(before);
    } finally { gate.release(); }
  });

  test(`landing: ${locale} four named sections explain places, itinerary and Naru in reading order`, async ({ page }) => {
    await prepareLandingMedia(page);
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto("/"); await storyReady(page);
    expect(await page.locator("main section[id]").evaluateAll(nodes => nodes.map(node => node.id))).toEqual(chapterIds);
    const names = en
      ? [/Explore Gyeongnam/, /^Explore Gyeongnam$/, /^From places to an itinerary$/, /^Plan with Naru$/]
      : [/경남 여행지를 찾고/, /^지역으로 둘러보기$/, /^장소 선택부터 일정 공유까지$/, /^나루에게 말해보세요$/];
    for (const [index, id] of chapterIds.entries()) {
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      await expect(section).toHaveAccessibleName(names[index]);
      await expect(section.locator("h1,h2").first()).toBeVisible();
    }
    await expect(page.locator(".simple-product-preview")).toHaveAttribute("aria-label", en ? "Example itinerary screen" : "일정 화면 예시");
    await expect(page.locator(".simple-naru-example")).toHaveAttribute("aria-label", en ? "Example conversation" : "대화 예시");
    await expect(page.locator(".landing-hero-copy")).toHaveCSS("opacity", "1");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include("#top").include("#story").include("#naru").analyze()).violations).toEqual([]);
  });
}
