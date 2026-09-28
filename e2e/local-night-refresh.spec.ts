import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
for (const width of [390, 960, 1440]) test(`night dropdowns remain readable and exclusive at ${width}px`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: 900 });
  await mockPlannerApi(page);
  await page.route('**/api/auth/**', route => route.fulfill({json:null}));
  await page.addInitScript(() => sessionStorage.setItem('wave-arrival-session-v1', 'done'));
  await page.goto('/');
  await expect(page.locator('#arrival-boot')).toHaveCount(0);
  await expect(page.locator('.arrival-scene')).toBeHidden();
  const support = page.getByRole('button', {name:'WAVE 이용 안내 메뉴',exact:true});
  await support.click();
  await page.getByRole('button',{name:'환경설정 열기',exact:true}).click();
  const panel = page.locator('.wave-support-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByText('홈 화면에 추가',{exact:true})).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'WAVE 앱 설치',exact:true})).toHaveCount(0);
  const assist = panel.getByRole('button',{name:/색 구분 보조/});
  await assist.click();
  await expect(assist).toHaveAttribute('aria-pressed','true');
  // The compact settings show the control's purpose and state; actual facility
  // shapes and their persistence are exercised by color-assist.spec.ts.
  await expect(assist).toContainText('색 대신 글자와 모양으로 상태를 구분해요.');
  expect(await page.evaluate(() => localStorage.getItem('wave-color-assist-v1'))).toBe('on');
  await expect(panel).toContainText('켜짐');
  const bounds = (await panel.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(901);
  const uncovered = await panel.evaluate(node=>{ const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+20,r.y+20)); });
  expect(uncovered).toBe(true);
  expect((await new AxeBuilder({page}).include('.wave-support-menu').analyze()).violations).toEqual([]);
  await page.screenshot({path:testInfo.outputPath(`settings-${width}.png`)});
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'환경설정 열기',exact:true})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(support).toBeFocused();
  const account = page.getByRole('button',{name:'계정 관리',exact:true});
  await account.click();
  await expect(page.locator('.header-dropdown').getByRole('link',{name:'로그인',exact:true})).toBeVisible();
  await support.click();
  await expect(page.locator('.header-dropdown:popover-open')).toHaveCount(1);
  await expect(page.locator('.header-dropdown').getByRole('link',{name:'로그인',exact:true})).toBeHidden();
});
