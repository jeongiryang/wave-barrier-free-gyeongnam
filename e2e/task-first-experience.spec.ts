import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPublicShellApi, mockPlannerApi, openItinerary, plan } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });
test('task pages put actual collections first at desktop, tablet and mobile widths', async ({ page }, info) => {
  await mockPublicShellApi(page);
  await page.route('**/api/community/posts?*', route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const path of ['/travel-book', '/community']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(path === '/travel-book' ? '내 여행' : '질문·후기');
    if (path === '/travel-book') {
      await expect(page.getByText('저장한 여행이 없습니다.', { exact: true })).toBeVisible();
      await expect(page.getByText('일정의 ‘내 여행에 저장’을 눌러 주세요.', { exact: true })).toBeVisible();
      await expect(page.locator('.travel-book-landscapes')).toHaveCount(0);
    } else {
      await expect(page.locator('.community-guides').filter({ has: page.getByText('이용 가이드', { exact: true }) })).not.toHaveAttribute('open', '');
      await page.locator('.community-guides > summary').filter({ hasText: /^이용 가이드$/ }).click();
      await expect(page.getByRole('heading', { name: '여행 준비 가이드' })).toBeVisible();
      await page.locator('.community-guides > summary').filter({ hasText: /^이용 가이드$/ }).click();
    }
    for (const width of info.project.name.startsWith('desktop') ? [1440,960] : [390]) {
      await page.setViewportSize({width,height:960});
      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path:info.outputPath(`${path.slice(1)}-${width}.png`)});
    }
    expect((await new AxeBuilder({page}).include('main').analyze()).violations).toEqual([]);
  }
});

test('saved trip shows a short Naru start and the timetable before optional tools', async ({ page }, info) => {
  await mockPlannerApi(page, {preserveView:true}); await mockPublicShellApi(page);
  await page.route('**/api/assistant', route => route.fulfill({json:{available:false}}));
  await page.goto('/planner');
  await page.getByRole('combobox',{name:'여행 지역',exact:true}).selectOption('창원');
  await page.getByRole('button',{name:'경남도립미술관 일정에 담기',exact:true}).click();
  await openItinerary(page,{start:'2026-10-14'});
  await expect(page.locator('.simple-more-trip-tools')).not.toHaveAttribute('open','');
  await expect(page.locator('.simple-stops')).toBeVisible();
  await page.getByRole('button',{name:'나루와 계획하기',exact:true}).click();
  const chat=page.getByRole('dialog',{name:'WAVE 여행 가이드 나루와 대화'});
  await expect(chat.getByRole('button',{name:'건너뛰기',exact:true})).toHaveCount(0);
  await expect(chat.locator('.naru-prompt-starters')).toHaveCount(0);
  await expect(chat.locator('.naru-trip-context')).toContainText('담은 장소 1곳');
  await expect(chat.getByLabel('현재 여행에서 이어가기').getByRole('button')).toHaveCount(3);
  await expect(chat.locator('.naru-extra-help')).not.toHaveAttribute('open','');
  await expect(chat.getByText('지금 안내 방식:',{exact:false})).not.toBeVisible();
  for (const width of info.project.name.startsWith('desktop') ? [1440,960] : [390]) {
    await page.setViewportSize({width,height:960});
    expect(await chat.locator('.naru-trip-context').evaluate(el => el.getBoundingClientRect().height)).toBeLessThan(90);
    expect(await chat.getByLabel('현재 여행에서 이어가기').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`naru-${width}.png`)});
  }
  expect((await new AxeBuilder({page}).include('.naru-panel').analyze()).violations).toEqual([]);
});

test('missing facility evidence can recover from an error without changing the saved trip', async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await mockPublicShellApi(page);
  await page.goto('/planner');
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  await page.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true }).click();
  const saved = await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'));
  await page.locator('.simple-place-row h3 button').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('항목별 편의정보가 없습니다. 최신 정보를 확인해 주세요.')).toBeVisible();
  await expect(dialog.locator('.evidence-counts')).toHaveCount(0);
  let calls = 0;
  await page.route('**/api/wave?action=places*', route => {
    calls++;
    return route.fulfill(calls === 1 ? { status: 503, json: { error: 'Unavailable' } } : { json: {
      places: [{ ...plan.places[0], accessibility: [{ key: 'route', label: '접근로', state: 'confirmed', detail: '입구까지 경사로 있음' }] }], missing: [],
    } });
  });
  await dialog.getByRole('button', { name: '편의정보 다시 조회' }).click();
  await expect(dialog.locator('.place-evidence-refresh')).toContainText('최신 정보를 불러오지 못했어요.');
  await dialog.getByRole('button', { name: '편의정보 다시 조회' }).click();
  await expect(dialog.locator('.facility-evidence-list')).toContainText('입구까지 경사로 있음');
  expect(calls).toBe(2);
  expect(await page.evaluate(() => localStorage.getItem('wave-current-trip-v1'))).toBe(saved);
});
