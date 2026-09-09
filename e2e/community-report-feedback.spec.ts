import { expect, test } from "@playwright/test";
import { mockPublicShellApi } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

async function expectNoSeriousA11yIssues(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(item => item.impact === "critical" || item.impact === "serious")).toEqual([]);
}

for (const target of ["post", "comment"] as const) for (const outcome of ["duplicate", "accepted", "network"] as const) for (const theme of ["light", "dark"] as const) {
  test(`${target} report ${outcome} in ${theme} keeps its controls and feedback visible`, async ({ page }) => {
    await mockPublicShellApi(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(theme => localStorage.setItem("wave-theme", theme), theme);
    await page.route("**/api/auth/get-session", route => route.fulfill({ json: { user: { id: "reporter-fixture", name: "검증 여행자", email: "traveler@example.com" }, session: { id: "fixture-session" } } }));
    const now = Date.now();
    const post = { id: "report-post", category: "place", title: "입구 경사로를 확인했어요", content: "직접 확인한 여행 경험입니다.", region: "창원", placeId: "1001", placeName: "경남도립미술관", authorName: "여행자", createdAt: now, updatedAt: now, commentCount: 8, likeCount: 0, likedByMe: false, isOwner: false };
    const comments = Array.from({ length: 8 }, (_, index) => ({ id: `comment-${index}`, content: "입구부터 전시장까지 동선을 확인했습니다. 현장 운영시간은 방문 전에 다시 확인해 주세요.", authorName: `여행자 ${index}`, createdAt: now, updatedAt: now, isOwner: false }));
    await page.route("**/api/community/posts/report-post", route => route.fulfill({ json: { post, comments } }));
    let requests = 0;
    let release!: () => void;
    const responseReady = new Promise<void>(resolve => { release = resolve; });
    const reportPath = target === "post" ? "**/api/community/posts/report-post/report" : "**/api/community/posts/report-post/comments/comment-7/report";
    await page.route(reportPath, async route => {
      requests++;
      expect(route.request().postDataJSON()).toEqual({ reason: "spam" });
      await responseReady;
      if (outcome === "network") return route.abort("failed");
      return route.fulfill(outcome === "duplicate" ? { status: 409, json: { error: "이미 운영팀에 전달한 내용입니다." } } : { status: 201, json: { reported: true, underReview: target === "post" } });
    });
    await page.goto("/community/report-post");
    await expect(page.getByRole("button", { name: "댓글 등록", exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    const control = target === "post" ? page.locator(".detail-actions > .community-report-control") : page.locator(".comment-list > li").last().locator(".community-report-control");
    const trigger = control.getByRole("button", { name: "신고", exact: true });
    await trigger.click();
    await expect(control.getByRole("button", { name: "사실과 다른 정보", exact: true })).toBeFocused();
    const panel = control.getByRole("group");
    const bounds = await panel.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    if (outcome === "accepted") await expectNoSeriousA11yIssues(page);
    await control.getByRole("button", { name: "광고·도배", exact: true }).click();
    await expect(trigger).toBeDisabled();
    await expect(control.getByRole("button", { name: "광고·도배", exact: true })).toBeDisabled();
    expect(requests).toBe(1);
    release();
    const text = outcome === "duplicate" ? "이미 운영팀에 전달한 내용입니다." : outcome === "network" ? "네트워크 연결을 확인한 뒤 다시 시도해 주세요." : target === "post" ? "운영팀 검토를 위해 잠시 숨김 처리했습니다." : "운영팀에 신고를 전달했습니다.";
    const message = control.getByRole(outcome === "accepted" ? "status" : "alert").filter({ hasText: text });
    await expect(message).toBeVisible();
    await expect(message).toBeInViewport();
    await expect(trigger).toBeEnabled();
    expect(requests).toBe(1);
    if (outcome === "accepted") {
      await expect(trigger).toBeFocused();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expectNoSeriousA11yIssues(page);
      await page.screenshot({ path: test.info().outputPath(`report-${target}-${theme}-${page.viewportSize()!.width}.png`) });
      for (const width of [960, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await trigger.click();
        await expect(control.getByRole("button", { name: "사실과 다른 정보", exact: true })).toBeFocused();
        await expect(panel).toBeInViewport();
        await page.screenshot({ path: test.info().outputPath(`report-menu-${target}-${theme}-${width}.png`) });
        await page.keyboard.press("Escape");
        await expect(trigger).toBeFocused();
      }
    } else {
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    }
  });
}
