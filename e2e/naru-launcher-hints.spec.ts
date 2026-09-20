import { expect, test } from '@playwright/test';
import { mockPlannerApi } from './fixtures';

const messages = [
  '여행 준비 맡겨보세요', '사진 속 여행정보를 읽어드려요',
  '일정도 대화로 바꿀 수 있어요', '필요한 편의를 함께 확인해요',
  '저장한 여행을 이어서 준비해요',
];

test('discovery hints cycle every three seconds without moving controls or announcing updates', async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.install();
  await page.goto('/guide');
  const hint = page.locator('.naru-hint'), prompt = hint.locator('button').first();
  await expect(prompt).toHaveText(messages[0]);
  await expect(hint).toHaveAttribute('aria-live', 'off');
  await page.mouse.move(0, 0);
  const box = await hint.boundingBox(), buttonBox = await prompt.boundingBox();
  for (let index = 1; index <= messages.length; index++) {
    await page.clock.fastForward(3000);
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
  const hint = page.locator('.naru-hint');
  await expect(hint.locator('button').first()).toHaveText(messages[0]);
  await page.clock.fastForward(12000);
  await expect(hint.locator('button').first()).toHaveText(messages[0]);
  await page.getByRole('button', { name: '나루 안내 그만 보기' }).click();
  await expect(hint).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기' })).toBeEnabled();
  await expect(hint).toHaveCount(0);
  await page.goto('/planner');
  await expect(page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기' })).toBeEnabled();
  await page.clock.fastForward(6000);
  await expect(hint).toHaveCount(0);
});

test('a visible hint opens Naru with its matching request', async ({ page }) => {
  await mockPlannerApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/guide');
  await page.getByRole('button', { name: messages[0], exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화' });
  await expect(panel).toBeVisible();
  await expect(panel.getByText('여행 준비를 맡기고 싶어요. 지역과 날짜부터 함께 정해주세요.', { exact: true })).toBeVisible();
  await expect(page.locator('.naru-hint')).toHaveCount(0);
});
