import { expect, test } from '@playwright/test';
import { mockPlannerApi } from './fixtures';

const messages = [
  '언제든 나루에게 물어보세요. 함께 여행을 준비해요.',
  '어디로 떠날까? 가고 싶은 곳을 함께 골라보자!',
  '걷는 시간, 쉬는 시간도 너에게 맞춰볼까?',
  '내가 만든 일정은 네가 확인하고 적용할 수 있어.',
];

test('discovery hints cycle every five seconds without moving controls or announcing updates', async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/guide');
  const hint = page.locator('.naru-welcome-bubble'), prompt = hint.locator('button').first();
  await expect(prompt).toHaveText(messages[0]);
  await expect(hint).toHaveAttribute('aria-live', 'off');
  await page.mouse.move(0, 0);
  const box = await hint.boundingBox(), buttonBox = await prompt.boundingBox();
  for (let index = 1; index <= messages.length; index++) {
    await page.clock.fastForward(5000);
    await expect(prompt).toHaveText(messages[index % messages.length]);
    expect(await hint.boundingBox()).toEqual(box);
    expect(await prompt.boundingBox()).toEqual(buttonBox);
  }
  await prompt.focus();
  await page.clock.fastForward(6000);
  await expect(prompt).toHaveText(messages[0]);
  await expect(prompt).toBeFocused();
  await prompt.evaluate(element => (element as HTMLElement).blur());
  await hint.hover();
  await page.clock.fastForward(6000);
  await expect(prompt).toHaveText(messages[0]);
  expect(await hint.boundingBox()).toEqual(box);
});

test('reduced motion keeps one usable hint and dismissal survives reload and navigation', async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/guide');
  const hint = page.locator('.naru-welcome-bubble');
  await expect(hint.locator('button').first()).toHaveText(messages[0]);
  await page.clock.fastForward(12000);
  await expect(hint.locator('button').first()).toHaveText(messages[0]);
  await page.getByRole('button', { name: '나루 안내 잠시 닫기' }).click();
  await expect(hint).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기' })).toBeEnabled();
  await expect(hint).toHaveCount(0);
  await page.goto('/planner');
  await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기' })).toBeEnabled();
  await page.clock.fastForward(6000);
  await expect(hint).toHaveCount(0);
});

test('a visible welcome hint opens an empty Naru conversation without sending a request', async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/guide');
  const requests: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname.startsWith('/api/assistant')) requests.push(request.url()); });
  await page.getByRole('button', { name: messages[0], exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화' });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('textbox')).toHaveValue('');
  // Compact Naru opens on the conversation tab without raising the keyboard.
  const compact = await page.evaluate(() => matchMedia('(max-width: 800px)').matches);
  await expect(compact ? panel.locator('#naru-tab-conversation') : panel.getByRole('textbox')).toBeFocused();
  expect(requests).toEqual([]);
  await expect(page.locator('.naru-welcome-bubble')).toHaveCount(0);
});
