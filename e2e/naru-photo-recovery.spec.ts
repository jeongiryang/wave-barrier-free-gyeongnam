import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } });
type PhotoRequest = { photo?: { mimeType: string; data: string }; messages: Array<{ content: string }> };
async function attachPhotos(chat: Locator, files: Array<{ name: string; mimeType: string; buffer: Buffer }>) {
  await chat.getByLabel('사진 또는 여행 도구 추가', { exact: true }).click();
  await chat.locator('.naru-add-menu').getByLabel('나루에게 첨부할 사진 선택', { exact: true }).setInputFiles(files);
  await expect(chat.getByAltText('첨부 사진', { exact: true })).toHaveCount(files.length);
  await chat.getByLabel('사진 또는 여행 도구 추가', { exact: true }).click();
}
async function setup(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, json: { error: 'Synthetic test fallback' } }));
  await mockPlannerApi(page, { preserveView: true }); await mockPublicShellApi(page);
  const bodies: PhotoRequest[] = [];
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
  await attachPhotos(chat, [{ name: 'poster.png', mimeType: 'image/png', buffer: Buffer.from(encoded, 'base64') }]);
  await expect(chat.getByAltText('첨부 사진', { exact: true })).toBeVisible();
  expect(bodies).toHaveLength(0);
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  await input.fill('사진의 날짜를 읽어줘');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('합성 일시 연결 오류');
  await expect(input).toHaveValue('사진의 날짜를 읽어줘');
  await expect(chat.getByAltText('첨부 사진', { exact: true })).toBeVisible();
  expect(bodies[0].photo?.mimeType).toBe('image/jpeg');
  await chat.getByRole('button', { name: '나루에게 보내기', exact: true }).click();
  await expect(chat.getByRole('log')).toContainText('합성 사진 내용: 창원 축제');
  await expect(chat.getByAltText('첨부 사진', { exact: true })).toHaveCount(0);
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

test('사진 세 장은 수동 전송 후 순서대로 처리하고 중간 실패 시 전체 초안을 보존한다', async ({ page }) => {
  const { chat } = await setup(page);
  const requests: PhotoRequest[] = [];
  const releases: Array<() => void> = [];
  const gates = Array.from({ length: 5 }, () => new Promise<void>(resolve => releases.push(resolve)));
  let active = 0, maxActive = 0;
  await page.route('**/api/assistant', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { available: true } });
    const index = requests.length;
    requests.push(route.request().postDataJSON());
    maxActive = Math.max(maxActive, ++active);
    await gates[index];
    active -= 1;
    await route.fulfill(index === 1
      ? { status: 503, json: { error: '두 번째 합성 사진 연결 오류' } }
      : { json: { photoReview: true, reply: `합성 사진 ${index < 2 ? index + 1 : index - 1} 읽기 완료`, photoFacts: [] } });
  });
  const images = await page.evaluate(() => ['#c84836', '#388a51', '#3769c2'].map(color => {
    const canvas = document.createElement('canvas'); canvas.width = 60; canvas.height = 40;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 60, 40);
    return canvas.toDataURL('image/png').split(',')[1];
  }));
  await attachPhotos(chat, images.map((data, index) => ({ name: `private-poster-${index + 1}.png`, mimeType: 'image/png', buffer: Buffer.from(data, 'base64') })));
  const previews = chat.getByAltText('첨부 사진', { exact: true });
  const photoSources = await previews.evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src));
  const input = chat.getByRole('textbox', { name: '나루에게 여행 질문하기', exact: true });
  const send = chat.getByRole('button', { name: '나루에게 보내기', exact: true });
  const question = '세 포스터의 날짜와 장소를 읽어줘';
  await input.fill(question);
  await expect(send).toBeEnabled();
  expect(requests).toHaveLength(0);
  expect(new Set(photoSources).size).toBe(3);
  try {
    await send.click();
    await expect.poll(() => requests.length).toBe(1);
    await expect(previews).toHaveCount(3);
    releases[0]();
    await expect.poll(() => requests.length).toBe(2);
    await expect(previews).toHaveCount(3);
    releases[1]();
    await expect(chat.getByRole('log')).toContainText('두 번째 합성 사진 연결 오류');
    await expect(input).toHaveValue(question);
    await expect(send).toBeEnabled();
    expect(await previews.evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src))).toEqual(photoSources);
    expect(requests).toHaveLength(2);
    await expect(chat.getByRole('log')).not.toContainText('합성 사진 1 읽기 완료');

    await send.click();
    for (const index of [2, 3, 4]) {
      await expect.poll(() => requests.length).toBe(index + 1);
      await expect(previews).toHaveCount(3);
      releases[index]();
    }
    await expect(chat.getByRole('log')).toContainText('합성 사진 3 읽기 완료');
    await expect(previews).toHaveCount(0);
    await expect(input).toHaveValue('');
    await expect(send).toBeDisabled();
    expect(requests).toHaveLength(5);
    expect(maxActive).toBe(1);
    expect(requests.map(body => `data:${body.photo?.mimeType};base64,${body.photo?.data}`)).toEqual([
      photoSources[0], photoSources[1], ...photoSources,
    ]);
    for (const body of requests) {
      expect(body.messages).toEqual([{ role: 'user', content: question }]);
      expect(body.photo?.mimeType).toBe('image/jpeg');
      expect(Array.isArray(body.photo)).toBe(false);
    }
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    for (const body of requests) expect(storage).not.toContain(body.photo!.data);
    expect(JSON.stringify(requests)).not.toContain('private-poster-');
  } finally {
    releases.forEach(release => release());
  }
});
