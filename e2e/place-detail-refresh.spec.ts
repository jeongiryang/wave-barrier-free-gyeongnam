import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, plan } from './fixtures';
import type { Place } from '../features/planner/types';

test.use({ storageState: { cookies: [], origins: [] } });
const consentName = '방문 전 확인할 후보로 담기';
const original: Place = { ...plan.places[0], checkedAt: '2026-09-20T09:00:00Z', knownFields: 1, unknownFields: 0, negativeFields: 0, accessibility: [{ key: 'route', label: '접근로', state: 'confirmed', detail: '이전 접근로 기록' }] };
function changed(state: 'negative' | 'unknown' | 'confirmed'): Place {
  return { ...original, checkedAt: '2026-09-29T09:00:00Z', address: '경상남도 창원시 최신 주소', knownFields: state === 'confirmed' ? 1 : 0, unknownFields: state === 'unknown' ? 1 : 0, negativeFields: state === 'negative' ? 1 : 0, accessibility: [{ key: 'route', label: '접근로', state, detail: `최신 접근로 ${state}` }] };
}
async function setup(page: Page, initial = original) {
  await mockPlannerApi(page, { preserveView: true });
  await page.addInitScript(() => sessionStorage.setItem('wave-session-facilities-v1', '["route"]'));
  await page.route('**/api/wave?action=plan*', route => route.fulfill({ json: { ...plan, criteria: { facilityKeys: ['route'] }, places: initial.accessibility?.[0]?.state === 'confirmed' ? [initial] : [], explorationPlaces: initial.accessibility?.[0]?.state === 'confirmed' ? [] : [initial], stops: [] } }));
}
async function open(page: Page, initial = original) {
  await page.goto('/planner?region=창원&travelStart=2026-10-08&travelEnd=2026-10-09');
  if (initial.accessibility?.[0]?.state !== 'confirmed') {
    await page.getByRole('checkbox', { name: /^편의정보 없는 곳도 보기/ }).check();
    await page.getByRole('button', { name: '적용하기', exact: true }).click();
  }
  const cards = page.locator('.simple-place-row, .simple-exploration article').filter({ has: page.getByRole('heading', { name: initial.name, exact: true }) });
  await cards.first().getByRole('button', { name: new RegExp(`${initial.name} (상세 보기|편의 확인)`) }).first().click();
  const dialog = page.getByRole('dialog', { name: initial.name, exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}
async function stored(page: Page) {
  return page.evaluate(() => {
    const values = JSON.parse(localStorage.getItem('wave-current-trip-v1') || '{}').values || {};
    return { ids: JSON.parse(values['wave-saved-places'] || '[]'), catalog: JSON.parse(values['wave-saved-place-catalog-v1'] || '[]'), facilities: JSON.parse(sessionStorage.getItem('wave-session-facilities-v1') || '[]'), schedule: JSON.parse(values['wave-trip-schedule-v1'] || '{}') };
  });
}

for (const state of ['negative', 'unknown'] as const) test(`refreshed ${state} facilities govern both the displayed detail and saving`, async ({ page }) => {
  await setup(page);
  const latest = changed(state);
  await page.route('**/api/wave?action=places*', route => route.fulfill({ json: { places: [latest], missing: [] } }));
  const dialog = await open(page);
  await expect(dialog).toContainText(latest.address);
  await dialog.getByRole('tab', { name: '이용과 편의', exact: true }).click();
  await expect(dialog.locator(`.facility-evidence-list [data-state="${state}"]`)).toContainText(`최신 접근로 ${state}`);
  const save = dialog.getByRole('button', { name: '일정에 추가', exact: true });
  await expect(save).toBeDisabled();
  expect((await stored(page)).facilities).toEqual(['route']);
  if (state === 'negative') {
    await expect(dialog.getByLabel(consentName, { exact: true })).toHaveCount(0);
    expect((await stored(page)).ids).toEqual([]);
  } else {
    await dialog.getByLabel(consentName, { exact: true }).check();
    await save.click();
    await expect(dialog).toHaveCount(0);
    await expect.poll(async () => (await stored(page)).catalog[0]?.address).toBe(latest.address);
    expect((await stored(page)).ids).toEqual([original.id]);
    expect((await stored(page)).schedule.travelStart).toBe('2026-10-08');
    // A newer mismatch must not prevent removing an already saved place.
    await page.route('**/api/wave?action=places*', route => route.fulfill({ json: { places: [changed('negative')], missing: [] } }));
    await page.locator('.simple-place-row').first().getByRole('button', { name: `${original.name} 상세 보기`, exact: true }).click();
    const savedDialog = page.getByRole('dialog', { name: original.name, exact: true });
    await savedDialog.getByRole('tab', { name: '이용과 편의', exact: true }).click();
    await expect(savedDialog.locator('.facility-evidence-list [data-state="negative"]')).toContainText('최신 접근로 negative');
    await expect(savedDialog.getByRole('button', { name: '일정에서 빼기', exact: true })).toBeEnabled();
    await savedDialog.getByRole('button', { name: '일정에서 빼기', exact: true }).click();
    await expect.poll(async () => (await stored(page)).ids).toEqual([]);
  }
});

test('a delayed replacement of unknown evidence resets the previous consent', async ({ page }) => {
  const initial = { ...changed('unknown'), checkedAt: original.checkedAt, address: original.address };
  await setup(page, initial);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/wave?action=places*', async route => { await pending; await route.fulfill({ json: { places: [changed('unknown')], missing: [] } }); });
  const dialog = await open(page, initial);
  await dialog.getByLabel(consentName, { exact: true }).check();
  await expect(dialog.getByRole('button', { name: '일정에 추가', exact: true })).toBeEnabled();
  release();
  await expect(dialog).toContainText(changed('unknown').address);
  await expect(dialog.getByLabel(consentName, { exact: true })).not.toBeChecked();
  await expect(dialog.getByRole('button', { name: '일정에 추가', exact: true })).toBeDisabled();
  expect((await stored(page)).facilities).toEqual(['route']);
});

test('an unrelated negative facility does not replace the selected requirements', async ({ page }) => {
  await setup(page);
  const latest = { ...changed('confirmed'), accessibility: [...changed('confirmed').accessibility!, { key: 'wheelchair', label: '휠체어 대여', state: 'negative' as const, detail: '대여 없음' }] };
  await page.route('**/api/wave?action=places*', route => route.fulfill({ json: { places: [latest], missing: [] } }));
  const dialog = await open(page);
  await expect(dialog).toContainText(latest.address);
  await expect(dialog.getByRole('button', { name: '일정에 추가', exact: true })).toBeEnabled();
  await expect(dialog.getByLabel(consentName, { exact: true })).toHaveCount(0);
  expect((await stored(page)).facilities).toEqual(['route']);
});

test('reloading missing item-level facilities updates the save boundary as well as the details', async ({ page }) => {
  const initial = { ...changed('unknown'), checkedAt: original.checkedAt, accessibility: [] };
  await setup(page, initial);
  let requests = 0;
  await page.route('**/api/wave?action=places*', route => route.fulfill({ json: { places: [++requests === 1 ? initial : changed('negative')], missing: [] } }));
  const dialog = await open(page, initial);
  await dialog.getByRole('tab', { name: '이용과 편의', exact: true }).click();
  await expect(dialog.locator('.place-evidence-refresh [role="status"]')).toContainText('최신 관광 정보를 확인했어요');
  await dialog.getByLabel(consentName, { exact: true }).check();
  await expect(dialog.getByRole('button', { name: '일정에 추가', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: '편의정보 다시 조회', exact: true }).click();
  await expect(dialog.locator('.facility-evidence-list [data-state="negative"]')).toContainText('최신 접근로 negative');
  await expect(dialog.getByLabel(consentName, { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: '일정에 추가', exact: true })).toBeDisabled();
  expect((await stored(page)).ids).toEqual([]);
  expect((await stored(page)).facilities).toEqual(['route']);
});

test('a failed refresh retains the prior dated evidence without claiming a new verification', async ({ page }) => {
  await setup(page);
  await page.route('**/api/wave?action=places*', route => route.fulfill({ status: 503, json: { error: 'Synthetic provider outage' } }));
  const dialog = await open(page);
  await dialog.locator('.place-detail-source > summary').click();
  await expect(dialog.getByRole('status')).toContainText('최신 정보를 불러오지 못했어요');
  await expect(dialog).toContainText(original.address);
  await dialog.getByRole('tab', { name: '이용과 편의', exact: true }).click();
  await expect(dialog.locator('.facility-evidence-list')).toContainText('이전 접근로 기록');
  await expect(dialog).not.toContainText('최신 접근로');
  expect((await stored(page)).facilities).toEqual(['route']);
});
