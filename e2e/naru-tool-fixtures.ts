import { expect, type Page } from '@playwright/test';

export const naruDialog = (page: Page) => page.getByRole('dialog', { name: 'WAVE 여행 가이드 나루와 대화', exact: true });
export async function openNaruTool(page: Page, label: string) {
  const chat = naruDialog(page);
  if (!await chat.isVisible()) await page.getByRole('button', { name: 'WAVE 여행 가이드 나루와 대화 열기', exact: true }).click();
  await expect(chat).toBeVisible();
  await chat.getByRole('tab', { name: '여행 도구', exact: true }).click();
  const catalog = chat.getByRole('button', { name: '← 모든 여행 도구', exact: true });
  if (await catalog.isVisible()) await catalog.click();
  await chat.getByRole('region', { name: '모든 여행 도구', exact: true }).locator('.naru-tools').getByRole('button', { name: label, exact: true }).click();
  await expect(chat).toBeVisible();
  return chat;
}
export async function closeNaruTool(page: Page) {
  await naruDialog(page).getByRole('button', { name: '나루 대화 닫기', exact: true }).click();
  await expect(naruDialog(page)).toBeHidden();
}
