import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { mockPlannerApi, mockPublicShellApi } from './fixtures';

test.use({ storageState: { cookies: [], origins: [] }, serviceWorkers: 'block' });
const deployment = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: Array<{ headers: Array<{ key: string; value: string }> }> };
const policy = deployment.headers.flatMap(item => item.headers).find(header => header.key === 'Content-Security-Policy')!.value;
// Synthetic MPEG-1 Layer III silence: real browser decoding, no official audio
// download. Zero side data with valid 128kbps/44.1kHz stereo frame headers.
const frame = Buffer.alloc(417); frame.set([0xff, 0xfb, 0x90, 0x00]);
const mp3 = Buffer.concat(Array.from({ length: 120 }, () => frame));
type PolicyWindow = Window & { audioPolicyViolations?: Array<{ directive: string; blocked: string }> };

for (const permitted of [true, false]) test(`production CSP ${permitted ? 'plays the exact official Odii origin' : 'blocks other media origins and keeps the transcript usable'}`, async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const audioUrl = permitted ? 'https://sfj608538-sfj608538.ktcdn.co.kr/file/audio/56/16166.mp3' : 'https://other.ktcdn.co.kr/untrusted.mp3';
  let suppliedAudioRequests = 0;
  const unexpected: string[] = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.pathname.startsWith('/api/')) {
      if (url.origin === origin) unexpected.push(url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  await mockPlannerApi(page, { preserveView: true }); await mockPublicShellApi(page);
  await page.route('**/api/community/posts?*', route => route.fulfill({ json: { posts: [], page: 1, hasMore: false } }));
  await page.route('**/api/wave?action=place-audio*', route => route.fulfill({ json: {
    stories: [{ id: 'synthetic-csp', title: '합성 장소 해설', audioTitle: '정책 검증 해설', audioUrl, script: '제공된 해설을 읽을 수 있어요. 합성 CSP 회귀 대본입니다.', playTime: '3' }], checkedAt: '2026-09-27T00:00:00Z',
  } }));
  await page.route(audioUrl, route => { suppliedAudioRequests++; return route.fulfill({ contentType: 'audio/mpeg', headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }, body: mp3 }); });
  await page.route('**/*', async route => {
    if (!route.request().isNavigationRequest() || new URL(route.request().url()).origin !== origin) return route.fallback();
    const response = await route.fetch();
    return route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': policy } });
  });
  await page.addInitScript(() => {
    (window as PolicyWindow).audioPolicyViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      (window as PolicyWindow).audioPolicyViolations!.push({ directive: event.effectiveDirective, blocked: event.blockedURI });
    });
  });
  const documentResponse = await page.goto('/planner');
  expect(documentResponse!.headers()['content-security-policy']).toBe(policy);
  await page.getByRole('combobox', { name: '여행 지역', exact: true }).selectOption('창원');
  await page.locator('.simple-place-row h3 button').first().click();
  const detail = page.locator('dialog.place-modal');
  await detail.locator('.place-audio-guide > summary').click();
  const audio = detail.locator('audio');
  await expect(audio).toHaveAttribute('src', audioUrl);
  expect(await audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  expect(suppliedAudioRequests).toBe(0);
  const outcome = await audio.evaluate(async (element: HTMLAudioElement) => {
    try { await element.play(); return 'playing'; } catch { return 'blocked'; }
  });
  if (permitted) {
    expect(outcome).toBe('playing');
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0);
    expect(await audio.evaluate((element: HTMLAudioElement) => element.duration)).toBeGreaterThan(2);
    await audio.evaluate((element: HTMLAudioElement) => element.pause());
    expect(await audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  } else {
    expect(outcome).toBe('blocked');
    await expect(detail.getByRole('alert')).toContainText('음원에 연결하지 못했어요');
  }
  await detail.getByText('선택해서 듣는 공간 음향', { exact: true }).click();
  await detail.getByRole('button', { name: '정책 검증 해설 공간 음향 듣기', exact: true }).click();
  if (permitted) {
    // This control becomes disabled only after AudioContext decoding succeeds.
    await expect(detail.getByRole('button', { name: '정책 검증 해설 공간 음향 듣기', exact: true })).toBeDisabled();
    await expect(detail.getByRole('button', { name: '공간 음향 중지', exact: true })).toBeEnabled();
    expect(suppliedAudioRequests).toBeGreaterThanOrEqual(2);
    await detail.getByRole('button', { name: '공간 음향 중지', exact: true }).click();
  } else {
    await expect(detail.getByText('공간 음향을 준비하지 못했어요.', { exact: false })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as PolicyWindow).audioPolicyViolations!.filter(item => item.blocked === 'https://other.ktcdn.co.kr/untrusted.mp3').map(item => item.directive).sort())).toEqual(['connect-src', 'media-src']);
    expect(suppliedAudioRequests).toBe(0);
  }
  await detail.getByRole('button', { name: '대본 읽기', exact: true }).click();
  await expect(detail.getByRole('region', { name: '정책 검증 해설 전체 대본', exact: true })).toContainText('합성 CSP 회귀 대본');
  expect(unexpected).toEqual([]);
});
