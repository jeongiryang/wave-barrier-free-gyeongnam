import { expect, test, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
async function setup(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic test fallback' } }));
  await mockPlannerApi(page, { preserveView: true }); await mockPublicShellApi(page);
  const bodies: Array<{ photo?: { mimeType: string; data: string }; messages: Array<{ content: string }> }> = [];
  await page.route('**/api/assistant', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    const body = route.request().postDataJSON(); bodies.push(body);
    if (bodies.length === 1) return route.fulfill({ status: 503, json: { error: '합성 일시 연결 오류' } });
    return route.fulfill({ json: body.photo ? { photoReview: true, reply: '합성 사진 내용: 창원 축제 10월 1일. 확인해 주세요.', proposal: { action: 'settings', region: '거제' } } : { reply: '합성 일반 답변', proposal: null } });
  });
  await page.goto('/planner');
  await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  const chat = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
  return { chat, bodies };
}

test('photo upload remains local until send, retries preserve it and later chat excludes image-derived history', async ({ page }) => {
  const { chat, bodies } = await setup(page);
  const encoded = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 20; canvas.height = 20; const ctx = canvas.getContext('2d')!; ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 20, 20); return canvas.toDataURL('image/png').split(',')[1]; });
  await chat.getByLabel('나루에게 첨부할 사진 선택', { exact: true }).setInputFiles({ name: 'poster.png', mimeType: 'image/png', buffer: Buffer.from(encoded, 'base64') });
  await expect(chat.getByAltText('보내기 전 첨부 사진 미리보기', { exact: true })).toBeVisible();
  expect(bodies).toHaveLength(0);
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  await input.fill('사진의 날짜를 읽어줘');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('합성 일시 연결 오류');
  await expect(input).toHaveValue('사진의 날짜를 읽어줘');
  await expect(chat.getByAltText('보내기 전 첨부 사진 미리보기', { exact: true })).toBeVisible();
  expect(bodies[0].photo?.mimeType).toBe('image/jpeg');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('합성 사진 내용: 창원 축제');
  await expect(chat.getByAltText('보내기 전 첨부 사진 미리보기', { exact: true })).toHaveCount(0);
  await expect(chat.locator('.naru-change-button')).toHaveCount(0);
  expect(bodies[1].photo).toEqual(bodies[0].photo);
  await input.fill('이번 여행에서 기억할 점을 설명해줘');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('합성 일반 답변');
  expect(bodies[2].photo).toBeUndefined();
  expect(JSON.stringify(bodies[2].messages)).not.toContain('합성 사진 내용');
  expect(JSON.stringify(bodies[2].messages)).not.toContain('사진 1장 첨부');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(bodies[0].photo!.data);
});
