import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mockPlannerApi, plan } from "./fixtures";

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
  test(`${locale}: main planning copy stays fully painted across forward and return scrolling`, async ({ page }) => {
    await mockPlannerApi(page);
    await page.addInitScript((value) => localStorage.setItem("wave-locale", value), locale);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    const copy = page.locator(".landing-hero-copy");
    const planning = page.locator(".landing-actions a[href='/planner']");
    await expect(copy).toHaveCSS("opacity", "1");
    await page.locator(".region-showcase-stage").scrollIntoViewIfNeeded();
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

  test(`${locale}: dates and optional activities remain editable without starting a search`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript((value) => localStorage.setItem("wave-locale", value), locale);
    let searches = 0;
    page.on("request", request => { if (request.url().includes("action=plan")) searches++; });
    await page.goto("/planner");
    await page.getByRole("button", { name: "창원 지역 선택", exact: true }).click();
    await page.locator(".planner-navigation nav button").nth(1).click();
    await page.locator(".profile-grid button").first().click();
    await page.evaluate(() => { history.pushState(null, "", "/planner?question=2#conditions"); dispatchEvent(new PopStateEvent("popstate")); });
    const search = page.locator(".condition-actions button").last();
    await expect(search).toBeEnabled();
    await expect(page.locator("#conditions > p[role=status]")).toHaveText(en ? "Leave this blank to explore all interests." : "아직 못 정했다면 모든 활동을 함께 살펴볼게요.");
    await page.evaluate(() => {
      history.pushState(null, "", "/planner?question=3#conditions");
      dispatchEvent(new PopStateEvent("popstate"));
    });
    await expect(page.locator(".reference-date-fields")).toBeVisible();
    expect(searches).toBe(0);
    await page.evaluate(() => { history.pushState(null, "", "/planner?question=2#conditions"); dispatchEvent(new PopStateEvent("popstate")); });
    const activity = page.locator(".theme-grid button").first();
    await activity.click();
    await expect(search).toBeEnabled();
    expect((await new AxeBuilder({ page }).include("#conditions").analyze()).violations).toEqual([]);
    await activity.click();
    await expect(search).toBeEnabled();
    expect(searches).toBe(0);
  });

  test(`${locale}: blank preferences browse places and selected dates open the default map itinerary`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    const gate = deferred(), searches: URL[] = [];
    await page.route("**/api/wave?**", async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") !== "plan") return route.fallback();
      searches.push(url);
      await gate.promise;
      await route.fulfill({ json: plan });
    });
    try {
      await page.goto("/planner?travelStart=2026-09-20&travelEnd=2026-09-21");
      await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
      await expect(page.locator('.theme-grid [aria-pressed="true"]')).toHaveCount(0);
      await expect(page.locator(".condition-region-field select")).toHaveValue("");
      await expect(page.locator('.reference-region-grid [aria-pressed="true"]')).toHaveCount(0);
      expect((await currentTrip(page)).profiles).toEqual([]);
      const search = page.locator(".condition-actions").getByRole("button", { name: en ? "Find places →" : "여행지 둘러보기 →", exact: true });
      await expect(search).toBeEnabled();
      await search.click();
      await expect.poll(() => searches.length).toBe(1);
      expect(searches[0].searchParams.get("region")).toBe("경남 전체");
      expect(searches[0].searchParams.get("profiles")).toBe("");
      expect(searches[0].searchParams.get("locale")).toBe(locale);
      const pending = page.locator(".condition-actions button").last();
      await expect(pending).toBeDisabled();
      await expect(pending).toHaveAttribute("aria-busy", "true");
      await expect(pending.locator(".button-loader")).toBeVisible();
      gate.release();
      const results = page.locator("#places");
      await expect(results.getByRole("heading", { name: "경남도립미술관", exact: true })).toBeVisible();
      await results.getByRole("button", { name: en ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가", exact: true }).click();
      await page.getByRole("button", { name: en ? "Next: Itinerary →" : "다음: 일정 만들기 →", exact: true }).click();
      const view = page.getByRole("group", { name: "일정 보기 방식", exact: true });
      await expect(view.getByRole("button", { name: "지도 함께 보기", exact: true })).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator('.reference-itinerary-layout[data-map="true"]')).toBeVisible();
      await expect(page.locator(".reference-board-map .leaflet-container")).toBeVisible();
      await expect(page.locator(".reference-day-list .reference-stop-copy")).toContainText("경남도립미술관");
      const selected = await currentTrip(page);
      expect(selected.ids).toEqual(["1001"]);
      expect(selected.profiles).toEqual([]);
      expect(selected.schedule).toMatchObject({ travelStart: "2026-09-20", travelEnd: "2026-09-21", scheduleAssignments: { "1001": "2026-09-20" } });
      await view.getByRole("button", { name: "시간표", exact: true }).click();
      await expect(page.locator(".reference-board-map")).toHaveCount(0);
      await view.getByRole("button", { name: "지도 함께 보기", exact: true }).click();
      await expect(page.locator(".reference-board-map .leaflet-container")).toBeVisible();
      expect(await currentTrip(page)).toEqual(selected);
    } finally { gate.release(); }
  });

  test(`${locale}: an unfiltered failed search keeps its choices and can be retried into results`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    const searches: URL[] = [];
    await page.route("**/api/wave?**", route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") !== "plan") return route.fallback();
      searches.push(url);
      return searches.length === 1
        ? route.fulfill({ status: 503, json: { error: "Synthetic provider outage" } })
        : route.fulfill({ json: plan });
    });
    await page.goto("/planner?travelStart=2026-09-20&travelEnd=2026-09-21");
    await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
    const search = page.locator(".condition-actions").getByRole("button", { name: en ? "Find places →" : "여행지 둘러보기 →", exact: true });
    await search.click();
    await expect(page.locator("#conditions > [role=alert]")).toContainText(en ? "Your choices are kept" : "선택한 조건은 유지됩니다");
    await expect(search).toBeEnabled();
    await expect(page.locator("#places .place-card")).toHaveCount(0);
    expect((await currentTrip(page)).profiles).toEqual([]);
    expect((await currentTrip(page)).schedule).toMatchObject({ travelStart: "2026-09-20", travelEnd: "2026-09-21" });
    await search.click();
    await expect(page.locator("#places").getByRole("heading", { name: "경남도립미술관", exact: true })).toBeVisible();
    expect(searches).toHaveLength(2);
    expect(searches[1].search).toBe(searches[0].search);
    expect((await currentTrip(page)).profiles).toEqual([]);
  });

  test(`${locale}: empty unfiltered results offer a working retry without inventing saved places`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    const searches: URL[] = [];
    await page.route("**/api/wave?**", route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("action") !== "plan") return route.fallback();
      searches.push(url);
      return route.fulfill({ json: searches.length === 1
        ? { ...plan, places: [], stops: [], statuses: plan.statuses.map(status => ({ ...status, count: 0 })) }
        : plan });
    });
    await page.goto("/planner?travelStart=2026-09-20&travelEnd=2026-09-21");
    await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
    await page.locator(".condition-actions").getByRole("button", { name: en ? "Find places →" : "여행지 둘러보기 →", exact: true }).click();
    const results = page.locator("#places");
    await expect(results.getByRole("heading", { name: en ? "No places match these preferences yet." : "선택한 조건에 맞는 여행지를 찾지 못했어요.", exact: true })).toBeVisible();
    await expect(page.locator(".planner-navigation nav button").nth(3)).toBeDisabled();
    const before = await currentTrip(page);
    expect(before.ids).toEqual([]);
    expect(before.profiles).toEqual([]);
    await results.locator(".place-empty").getByRole("button", { name: en ? "Find places" : "여행지 찾기", exact: true }).click();
    await expect.poll(() => searches.length).toBe(2);
    await expect(results.getByRole("heading", { name: "경남도립미술관", exact: true })).toBeVisible();
    expect(searches).toHaveLength(2);
    expect(searches[1].search).toBe(searches[0].search);
    expect(await currentTrip(page)).toEqual(before);
  });

  test(`${locale}: retrying visible results keeps the stage but blocks stale additions`, async ({ page }) => {
    await mockPlannerApi(page, { plannerView: "guided" });
    await page.addInitScript(value => localStorage.setItem("wave-locale", value), locale);
    const gate = deferred(); let searches = 0;
    await page.route("**/api/wave?**", async route => {
      if (new URL(route.request().url()).searchParams.get("action") !== "plan") return route.fallback();
      searches++;
      if (searches === 2) await gate.promise;
      await route.fulfill({ json: plan });
    });
    try {
      await page.goto("/planner?travelStart=2026-09-20&travelEnd=2026-09-21");
      await expect(page.locator(".journey-mode-toggle button").first()).toBeEnabled();
      await page.locator(".planner-navigation nav button").nth(1).click();
      await page.locator(".profile-grid button").first().click();
      await page.locator(".condition-actions").getByRole("button", { name: en ? "Find places →" : "여행지 둘러보기 →", exact: true }).click();
      const results = page.locator("#places");
      const museumName = en ? "경남도립미술관 Add to itinerary" : "경남도립미술관 일정에 추가";
      const lakeName = en ? "용지호수공원 Add to itinerary" : "용지호수공원 일정에 추가";
      await results.getByRole("button", { name: museumName, exact: true }).click();
      const before = await currentTrip(page);
      expect(before.ids).toEqual(["1001"]);
      expect(before.profiles).toEqual(["wheel"]);
      await page.locator(".planner-nav-search").click();
      await expect.poll(() => searches).toBe(2);
      await expect(results).toBeVisible();
      await expect(results.locator(".place-carousel")).toHaveAttribute("aria-busy", "true");
      await expect(results.getByRole("button", { name: lakeName, exact: true })).toBeDisabled();
      await expect(results.getByRole("button", { name: en ? "경남도립미술관 Remove from itinerary" : "경남도립미술관 일정에서 빼기", exact: true })).toBeEnabled();
      await expect(page.locator(".reference-completion")).toHaveAttribute("aria-valuenow", "0");
      expect(await currentTrip(page)).toEqual(before);
      gate.release();
      await expect(results.getByRole("button", { name: lakeName, exact: true })).toBeEnabled();
      await expect(results).toBeVisible();
      await expect(page.locator(".reference-completion")).toHaveAttribute("aria-valuenow", "50");
      expect(await currentTrip(page)).toEqual(before);
    } finally { gate.release(); }
  });

  test(`${locale}: landing journey summary has a localized accessible name and steps`, async ({ page }) => {
    await mockPlannerApi(page);
    await page.addInitScript((value) => localStorage.setItem("wave-locale", value), locale);
    await page.goto("/");
    await page.setViewportSize({ width: 1440, height: 960 });
    const summary = page.locator(".story-progress");
    await expect(page.locator(".landing-page.motion-ready")).toHaveCount(1);
    await expect(summary).toBeVisible();
    await expect(page.locator(".landing-hero-copy")).toHaveCSS("opacity", "1");
    await expect(summary).toHaveAccessibleName(en ? "Introduction sections" : "서비스 소개 페이지 탐색");
    await expect(summary.locator("#story-progress-list a > span")).toHaveText(en
      ? ["Welcome", "How it works", "Gyeongnam", "AI Naru", "Together", "Before leaving", "Community", "Plan a trip"]
      : ["처음", "여행 준비", "경남", "AI 나루", "함께 여행", "출발 전", "여행 이야기", "여행 계획"]);
    if (en) await expect(summary).not.toContainText(/[가-힣]/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).include(".landing-hero").analyze()).violations).toEqual([]);
  });
}
