import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });

test('place view preserves selection, survives reload and remains readable', async ({ page }, info) => {
  await mockPublicShellApi(page);
  await mockPlannerApi(page, { preserveView: true });
  await page.goto('/planner');
  const region = page.getByRole('combobox', { name: '여행 지역', exact: true });
  await expect(region).toBeEnabled();
  await region.selectOption('창원');
  await expect(page.locator('.simple-results .simple-place-row')).toHaveCount(2);
  const views = page.getByRole('group', { name: '여행지 보기 형식' });
  await expect(views.locator(':scope > span')).toHaveCount(0);
  await expect(views.getByRole('button', { name: '목록형' })).toHaveAttribute('aria-pressed', 'true');
  const searchForm = page.locator('.simple-direct-search-form');
  const searchButton = searchForm.getByRole('button', { name: '검색', exact: true });
  await expect(searchButton).toBeEnabled();
  await searchButton.click();
  await expect(page.getByText('장소나 지역을 두 글자 이상 입력해 주세요.', { exact: true })).toBeVisible();
  if (info.project.name === 'desktop-chromium') {
    const formWidth = (await searchForm.boundingBox())!.width;
    const workspaceWidth = (await page.locator('#places').boundingBox())!.width;
    expect(formWidth / workspaceWidth).toBeLessThanOrEqual(.52);
  }
  await page.getByRole('button', { name: '경남도립미술관 일정에 담기', exact: true }).click();
  await views.getByRole('button', { name: '격자형' }).focus();
  await page.keyboard.press('Enter');
  await expect(views.getByRole('button', { name: '격자형' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '경남도립미술관 담았음 · 되돌리기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const width of info.project.name === 'desktop-chromium' ? [1440, 960] : [390]) {
    await page.setViewportSize({ width, height: 960 });
    await expect.poll(async () => page.locator('.simple-results .simple-place-list').first().evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(width === 1440 ? 5 : width === 960 ? 3 : 1);
    const boxes = await page.locator('.simple-results .simple-place-row').evaluateAll(nodes => nodes.map(node => {
      const photo = node.querySelector('.simple-place-photo')!.getBoundingClientRect();
      const copy = node.querySelector('.simple-place-copy')!.getBoundingClientRect();
      const add = node.querySelector('.simple-place-add')!.getBoundingClientRect();
      return { vertical: copy.top >= photo.bottom, touch: add.height >= 44, overflow: node.scrollWidth > node.clientWidth + 1 };
    }));
    expect(boxes.every(box => box.vertical && box.touch && !box.overflow)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('.simple-results').screenshot({ path: info.outputPath(`grid-${width}.png`) });
  }
  expect((await new AxeBuilder({ page }).include('#places').analyze()).violations).toEqual([]);
  await page.reload();
  await expect(views.getByRole('button', { name: '격자형' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '경남도립미술관 담았음 · 되돌리기', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await views.getByRole('button', { name: '목록형' }).click();
  await expect(views.getByRole('button', { name: '목록형' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '경남도립미술관 담았음 · 되돌리기', exact: true })).toHaveAttribute('aria-pressed', 'true');
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
  await page.route('**/api/location-search?**', route => route.fulfill({ json: { places: [{ id: 'search-1', name: '테스트 카페', mapX: '128.691', mapY: '35.238', address: '경남 창원시', resultType: 'cafe' }] } }));
  await page.goto('/planner');
  const region = page.getByRole('combobox', { name: '여행 지역', exact: true });
  await expect(region).toBeEnabled();
  await region.selectOption('창원');
  const views = page.getByRole('group', { name: '여행지 보기 형식' });
  await views.getByRole('button', { name: '격자형' }).click();
  await expect(views.getByRole('button', { name: '격자형' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('combobox', { name: '여행지 검색', exact: true }).fill('테스트 카페');
  await page.locator('.simple-direct-search-form').getByRole('button', { name: '검색', exact: true }).click();
  const card = page.locator('#direct-place-results .simple-place-row');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('편의·접근성');
  expect(await card.evaluate(node => node.querySelector('.simple-place-copy')!.getBoundingClientRect().top >= node.querySelector('.simple-place-photo')!.getBoundingClientRect().bottom)).toBe(true);
  await views.getByRole('button', { name: '목록형' }).click();
  await expect(views.getByRole('button', { name: '목록형' })).toHaveAttribute('aria-pressed', 'true');
  await expect(card).toContainText('테스트 카페');
});

