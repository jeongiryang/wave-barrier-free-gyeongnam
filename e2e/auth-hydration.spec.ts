import { expect, test } from "@playwright/test";

for (const path of ["/login", "/register", "/forgot-password", "/reset-password?token=fixture-link"]) {
  test(`${path}: JavaScript가 준비되지 않으면 계정 입력과 기본 제출을 막는다`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const submissions: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET") submissions.push(request.method());
    });
    await page.goto(`${baseURL}${path}`);
    const form = page.locator("form");
    if (path === "/login" || path === "/register") {
      // Pending authentication exposes neither editable credentials nor a native form.
      await expect(page.getByRole('region', { name: '계정 확인', exact: true })).toHaveAttribute('aria-busy', 'true');
      await expect(form).toHaveCount(0);
      await expect(page.locator('input[type=password]')).toHaveCount(0);
      await expect(page.locator('noscript p')).toContainText('JavaScript를 허용해 주세요');
    } else {
      await expect(form).toHaveAttribute("method", "post");
      const fields = form.locator("input");
      expect(await fields.count()).toBeGreaterThan(0);
      for (const field of await fields.all()) await expect(field).toBeDisabled();
      await expect(form.locator('button[type="submit"]')).toBeDisabled();
      await expect(page.getByText("이 안내가 계속 보이면 브라우저의 JavaScript를 켜고 다시 열어 주세요.", { exact: false })).toBeVisible();
    }
    expect(submissions).toEqual([]);
    expect(new URL(page.url()).searchParams.has("password")).toBe(false);
    await context.close();
  });
}
