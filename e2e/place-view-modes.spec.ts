import { test, expect } from '@playwright/test';
import { chooseWaveOption } from './wave-select-fixture';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });

test('grid ignores the old list preference and preserves selection after reload', async ({ page }, info) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.addInitScript(() => localStorage.setItem('wave-place-view-v1', 'list'));
  await page.goto('/planner');
  const region = page.getByRole('combobox', { name: '여행 지역', exact: true });
  await expect(region).toBeEnabled();
  await chooseWaveOption(region, '창원');
  await expect(page.locator('.simple-results .simple-place-row')).toHaveCount(2);
  const workspace = page.locator('#places');
  await expect(workspace).toHaveAttribute('data-place-view', 'grid');
  await expect(page.getByRole('group', { name: '여행지 보기 형식' })).toHaveCount(0);
  const photo = page.locator('.simple-results .simple-place-photo img').first();
  await expect(photo).toHaveCSS('filter', 'none');
  if (info.project.name === 'desktop-chromium') {
    await page.locator('.simple-results .simple-place-row').first().hover();
    await expect(photo).toHaveCSS('filter', 'blur(7px) brightness(0.76)');
    await page.mouse.move(0, 0);
    await expect(photo).toHaveCSS('filter', 'none');
  }
  const add = page.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true });
  await expect(add).toHaveAttribute('title', '일정에 담기');
  await expect(page.getByRole('button', { name: '경남도립미술관 상세정보', exact: true })).toHaveAttribute('title', '자세히 보기');
  await add.click();
  await expect(page.locator('.simple-results .place-save-feedback').filter({ hasText: '담았습니다' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: '경남도립미술관 담았음 · 되돌리기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const width of info.project.name === 'desktop-chromium' ? [1440, 960] : [390]) {
    await page.setViewportSize({ width, height: 960 });
    await expect.poll(async () => page.locator('.simple-results .simple-place-list').first().evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBeGreaterThanOrEqual(width === 390 ? 1 : 2);
    const boxes = await page.locator('.simple-results .simple-place-row').evaluateAll(nodes => nodes.map(node => {
      const photo = node.querySelector('.simple-place-photo')!.getBoundingClientRect();
      const copy = node.querySelector('.simple-place-copy')!.getBoundingClientRect();
      const add = node.querySelector('.simple-place-add')!.getBoundingClientRect();
      const heading = node.querySelector('.simple-place-heading')!.getBoundingClientRect();
      const card = node.getBoundingClientRect();
      // #734 deliberately supersedes #728's split photograph/copy layout.
      return { fullPhoto: Math.abs(photo.top - card.top) <= 2 && Math.abs(photo.bottom - card.bottom) <= 2 && heading.top >= photo.top - 1 && copy.bottom <= photo.bottom && copy.width > 0 && node.querySelector('.simple-place-copy')!.scrollWidth <= node.querySelector('.simple-place-copy')!.clientWidth + 1, touch: add.height >= 44, overflow: node.scrollWidth > node.clientWidth + 1 };
    }));
    expect(boxes.every(box => box.fullPhoto && box.touch && !box.overflow)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('.simple-results').screenshot({ path: info.outputPath(`grid-${width}.png`) });
  }
  expect((await new AxeBuilder({ page }).include('#places').analyze()).violations).toEqual([]);
  await page.reload();
  await expect(workspace).toHaveAttribute('data-place-view', 'grid');
  await expect(page.getByRole('button', { name: '경남도립미술관 담았음 · 되돌리기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const undo = page.getByRole('button', { name: '경남도립미술관 담았음 · 되돌리기', exact: true });
  await expect(undo).toHaveAttribute('title', '담았습니다 · 되돌리기');
  await undo.click();
  await expect(page.locator('.simple-results .place-save-feedback').filter({ hasText: '담았습니다' })).toHaveCount(0);
  await expect(add).toHaveAttribute('aria-pressed','false');
});


test('grid also covers direct search when preference writes are blocked', async ({ page }) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'wave-place-view-v1') throw new DOMException('Quota exceeded', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.route('**/api/location-search?**', route => route.fulfill({ json: { places: [{ id: '987654321', name: '테스트 카페', mapX: '128.691', mapY: '35.238', address: '경남 창원시', resultType: 'cafe' }] } }));
  await page.goto('/planner');
  const region = page.getByRole('combobox', { name: '여행 지역', exact: true });
  await expect(region).toBeEnabled();
  await chooseWaveOption(region, '창원');
  await expect(page.locator('#places')).toHaveAttribute('data-place-view', 'grid');
  await expect(page.getByRole('group', { name: '여행지 보기 형식' })).toHaveCount(0);
  await page.getByRole('combobox', { name: '여행지 검색', exact: true }).fill('테스트 카페');
  await page.locator('.simple-direct-search-form').getByRole('button', { name: '검색', exact: true }).click();
  const card = page.locator('#direct-place-results .simple-place-row');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('편의·접근성');
  expect(await card.evaluate(node => {
    const copy = node.querySelector('.simple-place-copy')!.getBoundingClientRect();
    const photo = node.querySelector('.simple-place-photo')!.getBoundingClientRect();
    return copy.top >= photo.top && copy.bottom <= photo.bottom && copy.width > 0;
  })).toBe(true);
  await expect(card).toContainText('테스트 카페');
  await card.getByRole('button',{name:'테스트 카페 일정에 담기',exact:true}).click();
  await expect(card.locator('.place-save-feedback')).toHaveText('담았습니다');
  await card.getByRole('button',{name:'테스트 카페 담았음 · 되돌리기',exact:true}).click();
  await expect(card.locator('.place-save-feedback')).toBeEmpty();
});

