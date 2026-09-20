import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });

async function checkBounds(page: Page, panel: Locator) {
  const viewport = page.viewportSize()!, box = (await panel.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  for (const element of await panel.locator(':scope,.naru-workspace-body:visible,.naru-conversation-main:visible,.naru-log:visible,.naru-workspace-content:visible').all()) {
    expect(await element.evaluate(node => node.scrollWidth - node.clientWidth), (await element.getAttribute('class')) || 'workspace element').toBeLessThanOrEqual(1);
  }
}

async function checkTargets(controls: Locator) {
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded();
    const box = (await control.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(await control.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBe(true);
  }
}

for (const viewport of [{ width: 1440, height: 960 }, { width: 960, height: 800 }, { width: 390, height: 844 }]) {
  test(`Naru workspace fits ${viewport.width}px with usable tabs, preparation and saved work`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const origin = new URL(testInfo.project.use.baseURL as string).origin;
    await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.fallback() : route.abort());
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Unconfigured synthetic API' } }));
    await mockPlannerApi(page);
    const requests: string[] = [];
    await page.route('**/api/assistant', route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
      requests.push(route.request().postDataJSON().messages.at(-1).content);
      return route.fulfill({ json: { reply: '선택한 지역과 여행 날짜를 확인했어요.' } });
    });
    await page.goto('/planner?region=창원');
    await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
    const panel = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
    await expect(panel).toBeVisible();
    const tabs = panel.getByRole('tablist', { name: '나루 작업공간' });
    await checkBounds(page, panel);
    await checkTargets(tabs.getByRole('tab'));
    await panel.getByRole('button', { name: '여행 준비 맡기기 →', exact: true }).click();
    const form = panel.getByRole('form', { name: '여행 준비 맡기기', exact: true });
    await form.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
    await form.getByLabel('출발 날짜', { exact: true }).fill('2026-10-03');
    await form.getByLabel('마지막 날짜', { exact: true }).fill('2026-10-04');
    await form.getByRole('combobox', { name: '동행', exact: true }).selectOption('부모님과');
    await form.getByRole('button', { name: '가볍게', exact: true }).click();
    await checkTargets(form.locator('button,input,select'));
    await checkBounds(page, panel);
    await form.locator('header').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`naru-workspace-${viewport.width}.png`) });
    const formA11y = await new AxeBuilder({ page }).include('.naru-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(formA11y.violations).toEqual([]);
    await form.getByRole('button', { name: '이 조건으로 여행 준비 맡기기 →', exact: true }).click();
    await expect(panel.getByRole('log')).toContainText('선택한 지역과 여행 날짜를 확인했어요.');
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('부모님과 창원');
    await tabs.getByRole('tab', { name: '여행 도구', exact: true }).click();
    const tools = panel.getByRole('region', { name: '모든 여행 도구', exact: true });
    await expect(panel.locator('.naru-workspace-body')).toBeHidden();
    await expect(tools.locator('.naru-tools button')).toHaveCount(24);
    await checkTargets(tools.locator('.naru-tools button'));
    await checkBounds(page, panel);
    await tabs.getByRole('tab', { name: '저장한 내용', exact: true }).click();
    const saved = panel.getByRole('region', { name: '저장한 여행 작업', exact: true });
    await saved.getByLabel('여행 이름', { exact: true }).fill('부모님과 창원 여행');
    await saved.getByRole('button', { name: '대화와 현재 여행 저장', exact: true }).click();
    await expect(saved.getByRole('button', { name: '부모님과 창원 여행 이어가기', exact: true })).toBeVisible();
    await checkBounds(page, panel);
    await checkTargets(saved.locator('button,input'));
    const savedA11y = await new AxeBuilder({ page }).include('.naru-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(savedA11y.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`naru-workspace-saved-${viewport.width}.png`) });
    await tabs.getByRole('tab', { name: '대화', exact: true }).click();
    await expect(panel.getByRole('log')).toContainText('선택한 지역과 여행 날짜를 확인했어요.');
    await checkBounds(page, panel);
    expect(requests).toHaveLength(1);
  });
}
