import { expect, test } from '@playwright/test';
import { mockPlannerApi } from './fixtures';
import { chooseWaveOption, waveSelectNative } from './wave-select-fixture';

// Synthetic provider responses only; no real model or facility evidence is asserted.
test.use({ storageState: { cookies: [], origins: [] } });

test('PDF review: Naru tools and place details stay in the workspace; image paste stays a draft', async ({ page, isMobile }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: true } }));
  await page.goto('/planner?region=창원');
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('tab', { name: '직접 골라서 하기', exact: true }).click();
  await chat.getByRole('button', { name: '전체', exact: true }).click();
  await chat.getByRole('button', { name: /어디로 갈지 고르기/ }).click();
  await expect(chat.getByRole('combobox', { name: '여행 지역', exact: true })).toBeVisible();
  await expect(chat.locator('.places-section .simple-place-row').first()).toBeVisible();
  await expect(chat.getByRole('button', { name: '목록형', exact: true })).toHaveCount(0);
  if (!isMobile) {
    const card = chat.locator('.places-section .simple-place-row').first();
    const before = await card.boundingBox();
    await card.hover();
    await expect.poll(() => card.locator('.simple-place-photo img').evaluate(node => getComputedStyle(node).filter)).toMatch(/^blur\(/);
    const after = await card.boundingBox();
    expect(after?.height).toBe(before?.height);
    await chat.getByRole('tab', { name: '대화', exact: true }).hover();
    await expect.poll(() => card.locator('.simple-place-photo img').evaluate(node => getComputedStyle(node).filter)).toBe('none');
  }
  const url = page.url();
  await chat.locator('.places-section .simple-place-row').first().getByRole('button').first().click();
  const detail=page.locator('dialog.place-review-pane');
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('tab',{name:'기본정보',exact:true})).toBeVisible();
  await expect(detail.getByRole('tab',{name:'이용과 편의',exact:true})).toBeVisible();
  await expect(detail.getByRole('tab',{name:'후기',exact:true})).toBeVisible();
  await expect(detail.getByRole('button',{name:/방문 전에 물어보기/})).toBeVisible();
  await expect(detail.getByRole('heading',{name:'음성·대본 해설',exact:true})).toBeVisible();
  expect(page.url()).toBe(url);
  await detail.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(chat).toBeVisible();
  await chat.getByRole('tab', { name: '대화', exact: true }).click();
  const input = chat.locator('textarea').last();
  await input.evaluate(async node => {
    const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
    const blob = await new Promise<Blob>(resolve => canvas.toBlob(value => resolve(value!), 'image/png'));
    const transfer = new DataTransfer();
    for(let index=0;index<3;index++) transfer.items.add(new File([blob], `clipboard-${index}.png`, { type: 'image/png' }));
    node.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer, bubbles: true, cancelable: true }));
  });
  await expect(chat.getByRole('button', { name: '첨부 사진 크게 보기', exact: true })).toHaveCount(3);
  await expect(chat.getByRole('button', { name: /첨부 사진.*삭제/ })).toHaveCount(3);
  await chat.getByRole('button', { name: '첨부 사진 크게 보기', exact: true }).first().click();
  const viewer = page.getByRole('dialog', { name: '첨부 사진 크게 보기', exact: true });
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole('img')).toBeVisible();
  await viewer.getByRole('button', { name: '사진 크게 보기 닫기', exact: true }).click();
  await chat.getByRole('button', { name: '첨부 사진 삭제', exact: true }).nth(1).click();
  await expect(chat.getByRole('button', { name: '첨부 사진 크게 보기', exact: true })).toHaveCount(2);
  expect(page.url()).toBe(url);
});

test('moving place search into Naru and back preserves an unsubmitted search draft', async ({ page }) => {
  await mockPlannerApi(page, { preserveView: true });
  await page.route('**/api/assistant', route => route.fulfill({ json: { available: true } }));
  await page.goto('/planner?region=창원');
  const search = page.getByRole('combobox', { name: '여행지 검색', exact: true });
  await search.fill('작성 중인 검색');
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  await chat.getByRole('tab', { name: '직접 골라서 하기', exact: true }).click();
  await chat.getByRole('button', { name: '전체', exact: true }).click();
  await chat.getByRole('button', { name: /어디로 갈지 고르기/ }).click();
  await expect(chat.getByRole('combobox', { name: '여행지 검색', exact: true })).toHaveValue('작성 중인 검색');
  await search.fill('나루에서 이어 쓴 검색');
  await chat.getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(search).toBeVisible();
  await expect(search).toHaveValue('나루에서 이어 쓴 검색');
  await expect(page.getByRole('combobox', { name: '여행 지역', exact: true })).toHaveText('창원');
});

test('PDF review: local festival mock has separate red location pins', async ({ page }) => {
  await mockPlannerApi(page);
  await page.route('**/api/wave?action=festivals**', route => route.fulfill({ status: 503, json: { error: 'synthetic provider outage' } }));
  await page.goto('/festivals');
  const demo = page.locator('.local-festival-examples');
  await expect(demo).toBeVisible();
  await demo.getByRole('button', { name: '화장실·쉬는 곳 지도 보기', exact: true }).click();
  const preview = demo.getByRole('region', { name: '로컬 시설 시연', exact: true });
  await expect(preview).toContainText('실제 시설');
  await expect(preview.locator('.local-red-location-pin')).toHaveCount(2);
  await preview.getByRole('button', { name: '쉬는 곳 시연', exact: true }).click();
  await expect(preview.locator('.local-red-location-pin')).toHaveCount(2);
  await expect(preview).toContainText('[시연] 쉬는 곳 1');
});

test('PDF review: landing offers every region with a centered selected name', async ({ page }) => {
  await mockPlannerApi(page);
  await page.goto('/');
  const selector = page.getByRole('combobox', { name: '어디로 떠나고 싶으세요?', exact: true });
  await expect(waveSelectNative(selector).locator('option:not([disabled])')).toHaveCount(19);
  await chooseWaveOption(selector, '통영');
  await expect(selector).toHaveText('통영');
  expect(await selector.evaluate(node => getComputedStyle(node).textAlign)).toBe('center');
  await expect(page.locator('.landing-hero-signature')).toHaveCount(0);
});
